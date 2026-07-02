// EW-02 — AR/AP Ledger Repository
// Append-only. No UPDATE/DELETE on ledger rows. Corrections via reversal.

import {
  AccountingTransactionContext,
  ArApLedgerEntry,
  CreateArApLedgerEntryInput,
  QueryLedgerParams,
} from '../types/ar-ap.types';

export interface IDatabase {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (client: IDatabase) => Promise<T>): Promise<T>;
}

type QueryRunner = Pick<IDatabase, 'query'> | AccountingTransactionContext;

export class ArApLedgerRepository {
  constructor(private readonly db: IDatabase) {}

  private runner(tx?: AccountingTransactionContext): QueryRunner {
    return tx ?? this.db;
  }

  async insertEntry(
    input: CreateArApLedgerEntryInput,
    tx?: AccountingTransactionContext,
  ): Promise<ArApLedgerEntry> {
    const sql = `
      INSERT INTO ar_ap_ledger_entries (
        company_id, party_type, party_id, entry_type,
        debit_amount, credit_amount, currency_code,
        source_document_type, source_document_id, source_document_line_id,
        posting_date, accounting_period, reverses_entry_id,
        idempotency_key, notes, created_by
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16
      )
      ON CONFLICT (company_id, idempotency_key) DO NOTHING
      RETURNING *
    `;
    const { rows } = await this.runner(tx).query<ArApLedgerEntryRow>(sql, [
      input.companyId,
      input.partyType,
      input.partyId,
      input.entryType,
      input.debitAmount,
      input.creditAmount,
      input.currencyCode ?? 'VND',
      input.sourceDocumentType,
      input.sourceDocumentId,
      input.sourceDocumentLineId ?? null,
      input.postingDate,
      input.accountingPeriod,
      input.reversesEntryId ?? null,
      input.idempotencyKey,
      input.notes ?? null,
      input.createdBy,
    ]);

    if (rows.length === 0) {
      // Idempotent: already inserted — fetch and return existing within the same tx.
      return this.findByIdempotencyKey(input.companyId, input.idempotencyKey, tx);
    }
    return mapRow(rows[0]);
  }

  async findById(
    companyId: string,
    id: string,
    tx?: AccountingTransactionContext,
  ): Promise<ArApLedgerEntry | null> {
    const { rows } = await this.runner(tx).query<ArApLedgerEntryRow>(
      'SELECT * FROM ar_ap_ledger_entries WHERE id = $1 AND company_id = $2',
      [id, companyId],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async findByIdempotencyKey(
    companyId: string,
    key: string,
    tx?: AccountingTransactionContext,
  ): Promise<ArApLedgerEntry> {
    const { rows } = await this.runner(tx).query<ArApLedgerEntryRow>(
      'SELECT * FROM ar_ap_ledger_entries WHERE company_id = $1 AND idempotency_key = $2',
      [companyId, key],
    );
    if (!rows.length) throw new Error(`AR/AP ledger entry not found for idempotency key: ${key}`);
    return mapRow(rows[0]);
  }

  async findBySourceDocument(
    companyId: string,
    sourceDocumentType: string,
    sourceDocumentId: string,
    tx?: AccountingTransactionContext,
  ): Promise<ArApLedgerEntry[]> {
    const { rows } = await this.runner(tx).query<ArApLedgerEntryRow>(
      `SELECT * FROM ar_ap_ledger_entries
       WHERE company_id = $1
         AND source_document_type = $2
         AND source_document_id = $3
       ORDER BY created_at ASC`,
      [companyId, sourceDocumentType, sourceDocumentId],
    );
    return rows.map(mapRow);
  }

  async query(params: QueryLedgerParams, tx?: AccountingTransactionContext): Promise<ArApLedgerEntry[]> {
    const conditions: string[] = ['company_id = $1'];
    const values: unknown[] = [params.companyId];
    let idx = 2;

    if (params.partyType) {
      conditions.push(`party_type = $${idx++}`);
      values.push(params.partyType);
    }
    if (params.partyId) {
      conditions.push(`party_id = $${idx++}`);
      values.push(params.partyId);
    }
    if (params.sourceDocumentType) {
      conditions.push(`source_document_type = $${idx++}`);
      values.push(params.sourceDocumentType);
    }
    if (params.sourceDocumentId) {
      conditions.push(`source_document_id = $${idx++}`);
      values.push(params.sourceDocumentId);
    }
    if (params.fromDate) {
      conditions.push(`posting_date >= $${idx++}`);
      values.push(params.fromDate);
    }
    if (params.toDate) {
      conditions.push(`posting_date <= $${idx++}`);
      values.push(params.toDate);
    }

    const sql = `
      SELECT * FROM ar_ap_ledger_entries
      WHERE ${conditions.join(' AND ')}
      ORDER BY posting_date ASC, created_at ASC
    `;
    const { rows } = await this.runner(tx).query<ArApLedgerEntryRow>(sql, values);
    return rows.map(mapRow);
  }
}

// ─── Internal row type ────────────────────────────────────────
interface ArApLedgerEntryRow {
  id: string;
  company_id: string;
  party_type: string;
  party_id: string;
  entry_type: string;
  debit_amount: string;
  credit_amount: string;
  currency_code: string;
  source_document_type: string;
  source_document_id: string;
  source_document_line_id: string | null;
  posting_date: string;
  accounting_period: string;
  reverses_entry_id: string | null;
  idempotency_key: string;
  notes: string | null;
  created_at: string;
  created_by: string;
}

function mapRow(row: ArApLedgerEntryRow): ArApLedgerEntry {
  return {
    id: row.id,
    companyId: row.company_id,
    partyType: row.party_type as ArApLedgerEntry['partyType'],
    partyId: row.party_id,
    entryType: row.entry_type as ArApLedgerEntry['entryType'],
    debitAmount: parseFloat(row.debit_amount),
    creditAmount: parseFloat(row.credit_amount),
    currencyCode: row.currency_code,
    sourceDocumentType: row.source_document_type,
    sourceDocumentId: row.source_document_id,
    sourceDocumentLineId: row.source_document_line_id ?? undefined,
    postingDate: row.posting_date,
    accountingPeriod: row.accounting_period,
    reversesEntryId: row.reverses_entry_id ?? undefined,
    idempotencyKey: row.idempotency_key,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
