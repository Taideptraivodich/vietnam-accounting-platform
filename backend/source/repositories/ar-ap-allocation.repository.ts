// EW-02 — AR/AP Allocation Repository
// Append-only settlement event ledger. Allocation cancellation is a new
// negative allocation event with reversal_of_allocation_id; posted rows are never updated/deleted.

import {
  AccountingTransactionContext,
  ArApAllocation,
  CancelAllocationInput,
} from '../types/ar-ap.types';

export interface IDatabase {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (client: IDatabase) => Promise<T>): Promise<T>;
}

type QueryRunner = Pick<IDatabase, 'query'> | AccountingTransactionContext;

const ACTIVE_ALLOCATIONS_PREDICATE = `
  a.allocation_event_type = 'allocated'
  AND NOT EXISTS (
    SELECT 1
    FROM ar_ap_allocations r
    WHERE r.company_id = a.company_id
      AND r.reversal_of_allocation_id = a.id
      AND r.allocation_event_type IN ('cancelled', 'reversed')
  )
`;

const ALLOCATION_SELECT_COLUMNS = `
  a.*,
  CASE
    WHEN a.allocation_event_type IN ('cancelled', 'reversed') THEN 'cancelled'
    WHEN EXISTS (
      SELECT 1
      FROM ar_ap_allocations r
      WHERE r.company_id = a.company_id
        AND r.reversal_of_allocation_id = a.id
        AND r.allocation_event_type IN ('cancelled', 'reversed')
    ) THEN 'cancelled'
    ELSE 'active'
  END AS derived_status
`;

export class ArApAllocationRepository {
  constructor(private readonly db: IDatabase) {}

  private runner(tx?: AccountingTransactionContext): QueryRunner {
    return tx ?? this.db;
  }

  async insert(
    companyId: string,
    partyType: string,
    partyId: string,
    invoiceLedgerEntryId: string,
    paymentLedgerEntryId: string,
    allocatedAmount: number,
    currencyCode: string,
    allocationDate: string,
    idempotencyKey: string,
    createdBy: string,
    tx?: AccountingTransactionContext,
  ): Promise<ArApAllocation> {
    const sql = `
      INSERT INTO ar_ap_allocations (
        company_id, party_type, party_id,
        invoice_ledger_entry_id, payment_ledger_entry_id,
        allocated_amount, currency_code, allocation_date,
        allocation_event_type, reversal_of_allocation_id, reversal_reason,
        idempotency_key, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'allocated',NULL,NULL,$9,$10)
      ON CONFLICT (company_id, idempotency_key) DO NOTHING
      RETURNING *, 'active' AS derived_status
    `;
    const { rows } = await this.runner(tx).query<ArApAllocationRow>(sql, [
      companyId, partyType, partyId,
      invoiceLedgerEntryId, paymentLedgerEntryId,
      allocatedAmount, currencyCode, allocationDate,
      idempotencyKey, createdBy,
    ]);

    if (rows.length === 0) {
      return this.findByIdempotencyKey(companyId, idempotencyKey, tx);
    }
    return mapRow(rows[0]);
  }

  async findById(companyId: string, id: string, tx?: AccountingTransactionContext): Promise<ArApAllocation | null> {
    const { rows } = await this.runner(tx).query<ArApAllocationRow>(
      `SELECT ${ALLOCATION_SELECT_COLUMNS}
       FROM ar_ap_allocations a
       WHERE a.id = $1 AND a.company_id = $2`,
      [id, companyId],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async findByIdempotencyKey(
    companyId: string,
    key: string,
    tx?: AccountingTransactionContext,
  ): Promise<ArApAllocation> {
    const { rows } = await this.runner(tx).query<ArApAllocationRow>(
      `SELECT ${ALLOCATION_SELECT_COLUMNS}
       FROM ar_ap_allocations a
       WHERE a.company_id = $1 AND a.idempotency_key = $2`,
      [companyId, key],
    );
    if (!rows.length) throw new Error(`Allocation not found for idempotency key: ${key}`);
    return mapRow(rows[0]);
  }

  async findActiveByInvoiceEntry(
    companyId: string,
    invoiceLedgerEntryId: string,
    tx?: AccountingTransactionContext,
  ): Promise<ArApAllocation[]> {
    const { rows } = await this.runner(tx).query<ArApAllocationRow>(
      `SELECT ${ALLOCATION_SELECT_COLUMNS}
       FROM ar_ap_allocations a
       WHERE a.company_id = $1
         AND a.invoice_ledger_entry_id = $2
         AND ${ACTIVE_ALLOCATIONS_PREDICATE}
       ORDER BY a.allocation_date ASC, a.created_at ASC`,
      [companyId, invoiceLedgerEntryId],
    );
    return rows.map(mapRow);
  }

  async findActiveByPaymentEntry(
    companyId: string,
    paymentLedgerEntryId: string,
    tx?: AccountingTransactionContext,
  ): Promise<ArApAllocation[]> {
    const { rows } = await this.runner(tx).query<ArApAllocationRow>(
      `SELECT ${ALLOCATION_SELECT_COLUMNS}
       FROM ar_ap_allocations a
       WHERE a.company_id = $1
         AND a.payment_ledger_entry_id = $2
         AND ${ACTIVE_ALLOCATIONS_PREDICATE}
       ORDER BY a.allocation_date ASC, a.created_at ASC`,
      [companyId, paymentLedgerEntryId],
    );
    return rows.map(mapRow);
  }

  async findActiveBySourceDocument(
    companyId: string,
    sourceDocumentId: string,
    tx?: AccountingTransactionContext,
  ): Promise<ArApAllocation[]> {
    const { rows } = await this.runner(tx).query<ArApAllocationRow>(
      `SELECT ${ALLOCATION_SELECT_COLUMNS}
       FROM ar_ap_allocations a
       JOIN ar_ap_ledger_entries le ON le.id = a.invoice_ledger_entry_id
       WHERE a.company_id = $1
         AND le.source_document_id = $2
         AND ${ACTIVE_ALLOCATIONS_PREDICATE}
       ORDER BY a.allocation_date ASC, a.created_at ASC`,
      [companyId, sourceDocumentId],
    );
    return rows.map(mapRow);
  }

  async sumAllocatedForInvoiceEntry(
    companyId: string,
    invoiceLedgerEntryId: string,
    tx?: AccountingTransactionContext,
  ): Promise<number> {
    const { rows } = await this.runner(tx).query<{ total: string }>(
      `SELECT COALESCE(SUM(allocated_amount), 0) AS total
       FROM ar_ap_allocations
       WHERE company_id = $1
         AND invoice_ledger_entry_id = $2
         AND allocation_event_type IN ('allocated', 'cancelled', 'reversed')`,
      [companyId, invoiceLedgerEntryId],
    );
    return parseFloat(rows[0].total);
  }

  async sumAllocatedForPaymentEntry(
    companyId: string,
    paymentLedgerEntryId: string,
    tx?: AccountingTransactionContext,
  ): Promise<number> {
    const { rows } = await this.runner(tx).query<{ total: string }>(
      `SELECT COALESCE(SUM(allocated_amount), 0) AS total
       FROM ar_ap_allocations
       WHERE company_id = $1
         AND payment_ledger_entry_id = $2
         AND allocation_event_type IN ('allocated', 'cancelled', 'reversed')`,
      [companyId, paymentLedgerEntryId],
    );
    return parseFloat(rows[0].total);
  }

  /**
   * Append-only cancellation.
   *
   * Does not mutate the original allocation. Instead, appends a new negative
   * allocation event with reversal_of_allocation_id pointing to the original row.
   */
  async cancel(input: CancelAllocationInput, tx?: AccountingTransactionContext): Promise<ArApAllocation> {
    const idempotencyKey = input.idempotencyKey ?? `cancel:ar_ap_allocation:${input.allocationId}`;

    const sql = `
      INSERT INTO ar_ap_allocations (
        company_id, party_type, party_id,
        invoice_ledger_entry_id, payment_ledger_entry_id,
        allocated_amount, currency_code, allocation_date,
        allocation_event_type, reversal_of_allocation_id, reversal_reason,
        idempotency_key, created_by
      )
      SELECT
        a.company_id, a.party_type, a.party_id,
        a.invoice_ledger_entry_id, a.payment_ledger_entry_id,
        -a.allocated_amount, a.currency_code, CURRENT_DATE,
        'cancelled', a.id, $4,
        $5, $3
      FROM ar_ap_allocations a
      WHERE a.id = $1
        AND a.company_id = $2
        AND a.allocation_event_type = 'allocated'
        AND NOT EXISTS (
          SELECT 1
          FROM ar_ap_allocations r
          WHERE r.company_id = a.company_id
            AND r.reversal_of_allocation_id = a.id
            AND r.allocation_event_type IN ('cancelled', 'reversed')
        )
      ON CONFLICT (company_id, idempotency_key) DO NOTHING
      RETURNING *, 'cancelled' AS derived_status
    `;

    const { rows } = await this.runner(tx).query<ArApAllocationRow>(sql, [
      input.allocationId,
      input.companyId,
      input.cancelledBy,
      input.reason,
      idempotencyKey,
    ]);

    if (rows.length > 0) {
      return mapRow(rows[0]);
    }

    try {
      return await this.findByIdempotencyKey(input.companyId, idempotencyKey, tx);
    } catch {
      throw new Error(`Allocation ${input.allocationId} not found or already cancelled.`);
    }
  }
}

// ─── Internal row type ────────────────────────────────────────
interface ArApAllocationRow {
  id: string;
  company_id: string;
  party_type: string;
  party_id: string;
  invoice_ledger_entry_id: string;
  payment_ledger_entry_id: string;
  allocated_amount: string;
  currency_code: string;
  allocation_date: string;
  allocation_event_type: string;
  reversal_of_allocation_id: string | null;
  reversal_reason: string | null;
  idempotency_key: string;
  created_at: string;
  created_by: string;
  derived_status: string;
}

function mapRow(row: ArApAllocationRow): ArApAllocation {
  return {
    id: row.id,
    companyId: row.company_id,
    partyType: row.party_type as 'customer' | 'supplier',
    partyId: row.party_id,
    invoiceLedgerEntryId: row.invoice_ledger_entry_id,
    paymentLedgerEntryId: row.payment_ledger_entry_id,
    allocatedAmount: parseFloat(row.allocated_amount),
    currencyCode: row.currency_code,
    allocationDate: row.allocation_date,
    allocationEventType: row.allocation_event_type as ArApAllocation['allocationEventType'],
    status: row.derived_status as ArApAllocation['status'],
    reversalOfAllocationId: row.reversal_of_allocation_id ?? undefined,
    reversalReason: row.reversal_reason ?? undefined,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
