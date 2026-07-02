// EW-02 — AR/AP Routes
// All routes scoped under /api/v1/companies/:companyId/
// Company context is mandatory on every request.
//
// P0 hotfix v1.3: normalize Express params/headers/query values at the
// route boundary before constructing service DTOs. This is intentionally
// route-only and does not change AR/AP accounting, allocation or schema semantics.

import { Router, Request, Response, NextFunction } from 'express';
import { ArApService } from '../services/ar-ap.service';

export function requiredSingle(value: unknown, field: string): string {
  if (Array.isArray(value)) {
    if (value.length !== 1 || typeof value[0] !== 'string' || value[0].trim() === '') {
      throw new Error(`${field} must be a single non-empty string.`);
    }
    return value[0];
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

export function optionalSingle(value: unknown, field: string): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    if (value.length !== 1 || typeof value[0] !== 'string') {
      throw new Error(`${field} must be a single string.`);
    }
    return value[0];
  }
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string.`);
  }
  return value;
}

function requiredIdempotencyKey(req: Request): string {
  const idempotencyKey = optionalSingle(req.headers['idempotency-key'], 'idempotency-key')
    ?? optionalSingle(req.body?.idempotencyKey, 'idempotencyKey');

  if (idempotencyKey == null || idempotencyKey.trim() === '') {
    throw new Error('idempotencyKey must be a non-empty string.');
  }

  return idempotencyKey;
}

function optionalIdempotencyKey(req: Request): string | undefined {
  return optionalSingle(req.headers['idempotency-key'], 'idempotency-key')
    ?? optionalSingle(req.body?.idempotencyKey, 'idempotencyKey');
}

export function createArApRouter(arApService: ArApService): Router {
  const router = Router({ mergeParams: true });

  // ─── Middleware: enforce company context ─────────────────────
  router.use((req: Request, res: Response, next: NextFunction) => {
    try {
      requiredSingle(req.params.companyId, 'companyId');
      next();
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // ════════════════════════════════════════════════════════════
  // RECEIPT VOUCHERS (AR)
  // ════════════════════════════════════════════════════════════

  // POST /api/v1/companies/:companyId/receipt-vouchers
  router.post('/receipt-vouchers', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const result = await arApService.createReceiptVoucher({
        companyId,
        voucherDate: req.body.voucherDate,
        customerId: req.body.customerId,
        receivedAmount: req.body.receivedAmount,
        currencyCode: req.body.currencyCode,
        debitAccountId: req.body.debitAccountId,
        creditAccountId: req.body.creditAccountId,
        notes: req.body.notes,
        createdBy: req.body.createdBy,
      });
      res.status(201).json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // POST /api/v1/companies/:companyId/receipt-vouchers/:id/post
  router.post('/receipt-vouchers/:id/post', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const voucherId = requiredSingle(req.params.id, 'id');
      const idempotencyKey = requiredIdempotencyKey(req);
      const result = await arApService.postReceiptVoucher({
        companyId,
        receiptVoucherId: voucherId,
        idempotencyKey,
        postedBy: req.body.postedBy,
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // POST /api/v1/companies/:companyId/receipt-vouchers/:id/cancel
  router.post('/receipt-vouchers/:id/cancel', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const voucherId = requiredSingle(req.params.id, 'id');
      const result = await arApService.cancelReceiptVoucher({
        companyId,
        receiptVoucherId: voucherId,
        cancelledBy: req.body.cancelledBy,
        reason: req.body.reason,
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // ════════════════════════════════════════════════════════════
  // PAYMENT VOUCHERS (AP)
  // ════════════════════════════════════════════════════════════

  // POST /api/v1/companies/:companyId/payment-vouchers
  router.post('/payment-vouchers', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const result = await arApService.createPaymentVoucher({
        companyId,
        voucherDate: req.body.voucherDate,
        supplierId: req.body.supplierId,
        paidAmount: req.body.paidAmount,
        currencyCode: req.body.currencyCode,
        debitAccountId: req.body.debitAccountId,
        creditAccountId: req.body.creditAccountId,
        notes: req.body.notes,
        createdBy: req.body.createdBy,
      });
      res.status(201).json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // POST /api/v1/companies/:companyId/payment-vouchers/:id/post
  router.post('/payment-vouchers/:id/post', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const voucherId = requiredSingle(req.params.id, 'id');
      const idempotencyKey = requiredIdempotencyKey(req);
      const result = await arApService.postPaymentVoucher({
        companyId,
        paymentVoucherId: voucherId,
        idempotencyKey,
        postedBy: req.body.postedBy,
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // POST /api/v1/companies/:companyId/payment-vouchers/:id/cancel
  router.post('/payment-vouchers/:id/cancel', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const voucherId = requiredSingle(req.params.id, 'id');
      const result = await arApService.cancelPaymentVoucher({
        companyId,
        paymentVoucherId: voucherId,
        cancelledBy: req.body.cancelledBy,
        reason: req.body.reason,
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // ════════════════════════════════════════════════════════════
  // ALLOCATIONS
  // ════════════════════════════════════════════════════════════

  // POST /api/v1/companies/:companyId/ar-ap/allocations
  router.post('/ar-ap/allocations', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const idempotencyKey = requiredIdempotencyKey(req);
      const result = await arApService.allocatePayment({
        companyId,
        partyType: req.body.partyType,
        partyId: req.body.partyId,
        paymentLedgerEntryId: req.body.paymentLedgerEntryId,
        allocations: req.body.allocations,
        allocationDate: req.body.allocationDate,
        idempotencyKey,
        createdBy: req.body.createdBy,
      });
      res.status(201).json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // POST /api/v1/companies/:companyId/ar-ap/allocations/:id/cancel
  router.post('/ar-ap/allocations/:id/cancel', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const allocationId = requiredSingle(req.params.id, 'id');
      const idempotencyKey = optionalIdempotencyKey(req);
      const result = await arApService.cancelAllocation({
        companyId,
        allocationId,
        cancelledBy: req.body.cancelledBy,
        reason: req.body.reason,
        idempotencyKey,
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // ════════════════════════════════════════════════════════════
  // QUERIES
  // ════════════════════════════════════════════════════════════

  // GET /api/v1/companies/:companyId/ar-ap/outstanding?partyType=customer&partyId=...
  router.get('/ar-ap/outstanding', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const partyType = requiredSingle(req.query.partyType, 'partyType') as 'customer' | 'supplier';
      const partyId = optionalSingle(req.query.partyId, 'partyId');
      const status = optionalSingle(req.query.status, 'status') as 'open' | 'partial' | 'settled' | 'cancelled' | undefined;

      if (partyId == null || partyId.trim() === '') {
        throw new Error('partyId must be a non-empty string.');
      }

      const result = await arApService.queryOutstanding({
        companyId,
        partyType,
        partyId,
        status,
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // GET /api/v1/companies/:companyId/ar-ap/ledger
  router.get('/ar-ap/ledger', async (req: Request, res: Response) => {
    try {
      const companyId = requiredSingle(req.params.companyId, 'companyId');
      const result = await arApService.queryLedger({
        companyId,
        partyType: optionalSingle(req.query.partyType, 'partyType') as 'customer' | 'supplier' | undefined,
        partyId: optionalSingle(req.query.partyId, 'partyId'),
        sourceDocumentType: optionalSingle(req.query.sourceDocumentType, 'sourceDocumentType'),
        sourceDocumentId: optionalSingle(req.query.sourceDocumentId, 'sourceDocumentId'),
        fromDate: optionalSingle(req.query.fromDate, 'fromDate'),
        toDate: optionalSingle(req.query.toDate, 'toDate'),
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}

// Mount instructions:
// app.use('/api/v1/companies/:companyId', createArApRouter(arApService));
