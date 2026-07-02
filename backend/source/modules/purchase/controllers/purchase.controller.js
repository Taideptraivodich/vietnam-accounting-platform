/**
 * EW-04 — Purchase Controllers
 * Architecture Freeze v1.0
 * All APIs scoped under /api/v1/companies/:companyId/...
 */

const { Router } = require('express');

function createPurchaseRouter({ purchaseInvoiceService, purchaseReceiptService, grniMetadataService }) {
  const router = Router({ mergeParams: true });

  // -------------------------------------------------------
  // PURCHASE RECEIPTS
  // -------------------------------------------------------

  // POST /api/v1/companies/:companyId/purchase/receipts
  router.post('/receipts', async (req, res) => {
    try {
      const { companyId } = req.params;
      const result = await purchaseReceiptService.createDraft(companyId, req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  // POST /api/v1/companies/:companyId/purchase/receipts/:receiptId/post
  router.post('/receipts/:receiptId/post', async (req, res) => {
    try {
      const { companyId, receiptId } = req.params;
      const result = await purchaseReceiptService.postReceipt(companyId, receiptId);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  // POST /api/v1/companies/:companyId/purchase/receipts/:receiptId/cancel
  router.post('/receipts/:receiptId/cancel', async (req, res) => {
    try {
      const { companyId, receiptId } = req.params;
      const result = await purchaseReceiptService.cancelReceipt(companyId, receiptId);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  // -------------------------------------------------------
  // PURCHASE INVOICES
  // -------------------------------------------------------

  // POST /api/v1/companies/:companyId/purchase/invoices
  router.post('/invoices', async (req, res) => {
    try {
      const { companyId } = req.params;
      const result = await purchaseInvoiceService.createDraft(companyId, req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  // POST /api/v1/companies/:companyId/purchase/invoices/:invoiceId/post
  router.post('/invoices/:invoiceId/post', async (req, res) => {
    try {
      const { companyId, invoiceId } = req.params;
      const result = await purchaseInvoiceService.postInvoice(companyId, invoiceId);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  // POST /api/v1/companies/:companyId/purchase/invoices/:invoiceId/cancel
  router.post('/invoices/:invoiceId/cancel', async (req, res) => {
    try {
      const { companyId, invoiceId } = req.params;
      const result = await purchaseInvoiceService.cancelInvoice(companyId, invoiceId);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  // -------------------------------------------------------
  // GRNI METADATA
  // -------------------------------------------------------

  // POST /api/v1/companies/:companyId/purchase/grni-account
  router.post('/grni-account', async (req, res) => {
    try {
      const { companyId } = req.params;
      const result = await grniMetadataService.registerGRNIAccount(companyId, req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  // GET /api/v1/companies/:companyId/purchase/grni-account
  router.get('/grni-account', async (req, res) => {
    try {
      const { companyId } = req.params;
      const result = await grniMetadataService.getGRNIAccount(companyId);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  });

  return router;
}

function handleError(res, err) {
  const msg = err.message || 'Internal error';

  if (msg.startsWith('NOT_FOUND')) return res.status(404).json({ error: msg });
  if (msg.startsWith('INVALID_STATE')) return res.status(409).json({ error: msg });
  if (msg.startsWith('CANCEL_BLOCKED')) return res.status(409).json({ error: msg });
  if (msg.startsWith('DUPLICATE')) return res.status(409).json({ error: msg });
  if (msg.startsWith('PERIOD_LOCKED')) return res.status(422).json({ error: msg });
  if (msg.startsWith('GRNI_NOT_CONFIGURED')) return res.status(422).json({ error: msg });
  if (msg.startsWith('GRNI_METADATA_INVALID')) return res.status(422).json({ error: msg });
  if (msg.startsWith('INVALID')) return res.status(400).json({ error: msg });

  // Zod validation errors
  if (err.name === 'ZodError' || err.name === 'ValidationError') {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
  }

  console.error('[EW-04] Unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
}

module.exports = { createPurchaseRouter };
