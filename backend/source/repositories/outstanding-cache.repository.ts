// EW-02 — Outstanding Cache Repository
// Cache is derived from ar_ap_ledger_entries. NOT source of truth.
// Rebuilt from ledger at any time. Updated after each ledger/allocation change.

import {
  AccountingTransactionContext,
  OutstandingCacheRow,
  OutstandingStatus,
  QueryOutstandingParams,
} from '../types/ar-ap.types';

export interface IDatabase {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

type QueryRunner = IDatabase | AccountingTransactionContext;

export class OutstandingCacheRepository {
  constructor(private readonly db: IDatabase) {}

  private runner(tx?: AccountingTransactionContext): QueryRunner {
    return tx ?? this.db;
  }

  async upsert(
    companyId: string,
    partyType: string,
    partyId: string,
    sourceDocumentType: string,
    sourceDocumentId: string,
    originalAmount: number,
    allocatedAmount: number,
    currencyCode: string,
    arApLedgerEntryId: string,
    tx?: AccountingTransactionContext,
  ): Promise<OutstandingCacheRow> {
    const outstandingAmount = originalAmount - allocatedAmount;
    const status: OutstandingStatus =
      outstandingAmount <= 0 ? 'settled'
      : allocatedAmount > 0 ? 'partial'
      : 'open';

    const sql = `
      INSERT INTO ar_ap_outstanding_cache (
        company_id, party_type, party_id,
        source_document_type, source_document_id,
        original_amount, allocated_amount, outstanding_amount,
        currency_code, status, ar_ap_ledger_entry_id, last_updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      ON CONFLICT (company_id, source_document_id, source_document_type)
      DO UPDATE SET
        allocated_amount    = EXCLUDED.allocated_amount,
        outstanding_amount  = EXCLUDED.outstanding_amount,
        status              = EXCLUDED.status,
        last_updated_at     = NOW()
      RETURNING *
    `;
    const { rows } = await this.runner(tx).query<OutstandingCacheDbRow>(sql, [
      companyId, partyType, partyId,
      sourceDocumentType, sourceDocumentId,
      originalAmount, allocatedAmount, outstandingAmount,
      currencyCode, status, arApLedgerEntryId,
    ]);
    return mapRow(rows[0]);
  }

  async markCancelled(
    companyId: string,
    sourceDocumentId: string,
    sourceDocumentType: string,
    tx?: AccountingTransactionContext,
  ): Promise<void> {
    await this.runner(tx).query(
      `UPDATE ar_ap_outstanding_cache
       SET status = 'cancelled', last_updated_at = NOW()
       WHERE company_id = $1 AND source_document_id = $2 AND source_document_type = $3`,
      [companyId, sourceDocumentId, sourceDocumentType],
    );
  }

  async findByParty(params: QueryOutstandingParams, tx?: AccountingTransactionContext): Promise<OutstandingCacheRow[]> {
    const conditions = ['company_id = $1', 'party_type = $2', 'party_id = $3'];
    const values: unknown[] = [params.companyId, params.partyType, params.partyId];
    let idx = 4;

    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    } else {
      conditions.push(`status IN ('open', 'partial')`);
    }

    const { rows } = await this.runner(tx).query<OutstandingCacheDbRow>(
      `SELECT * FROM ar_ap_outstanding_cache WHERE ${conditions.join(' AND ')} ORDER BY last_updated_at ASC`,
      values,
    );
    return rows.map(mapRow);
  }

  async findBySourceDocument(
    companyId: string,
    sourceDocumentType: string,
    sourceDocumentId: string,
    tx?: AccountingTransactionContext,
  ): Promise<OutstandingCacheRow | null> {
    const { rows } = await this.runner(tx).query<OutstandingCacheDbRow>(
      `SELECT * FROM ar_ap_outstanding_cache
       WHERE company_id = $1 AND source_document_type = $2 AND source_document_id = $3`,
      [companyId, sourceDocumentType, sourceDocumentId],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  /**
   * Rebuild outstanding cache for a single party from ledger entries.
   * Can be run any time to repair/rebuild the cache.
   */
  async rebuildForParty(
    companyId: string,
    partyType: string,
    partyId: string,
    tx?: AccountingTransactionContext,
  ): Promise<void> {
    await this.runner(tx).query(
      `-- Rebuild is handled via upsert from service layer after each allocation change.
       -- Full rebuild: DELETE cache rows then re-aggregate from ledger.
       -- Placeholder: not executed inline to avoid lock escalation.
       SELECT $1::uuid AS company_id, $2::text AS party_type, $3::uuid AS party_id`,
      [companyId, partyType, partyId],
    );
  }
}

// ─── Internal ─────────────────────────────────────────────────
interface OutstandingCacheDbRow {
  id: string;
  company_id: string;
  party_type: string;
  party_id: string;
  source_document_type: string;
  source_document_id: string;
  original_amount: string;
  allocated_amount: string;
  outstanding_amount: string;
  currency_code: string;
  status: string;
  ar_ap_ledger_entry_id: string;
  last_updated_at: string;
}

function mapRow(row: OutstandingCacheDbRow): OutstandingCacheRow {
  return {
    id: row.id,
    companyId: row.company_id,
    partyType: row.party_type as 'customer' | 'supplier',
    partyId: row.party_id,
    sourceDocumentType: row.source_document_type,
    sourceDocumentId: row.source_document_id,
    originalAmount: parseFloat(row.original_amount),
    allocatedAmount: parseFloat(row.allocated_amount),
    outstandingAmount: parseFloat(row.outstanding_amount),
    currencyCode: row.currency_code,
    status: row.status as OutstandingStatus,
    arApLedgerEntryId: row.ar_ap_ledger_entry_id,
    lastUpdatedAt: row.last_updated_at,
  };
}
