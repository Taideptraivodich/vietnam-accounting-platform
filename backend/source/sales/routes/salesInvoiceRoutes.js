/**
 * Express-compatible route registration. The router is injected by the host app.
 * This file does not import or configure Express so EW-03 remains framework-light.
 */
function registerSalesInvoiceRoutes(router, { salesInvoiceService, salesPostingService }) {
  router.get('/api/v1/companies/:companyId/sales-invoices', async (req, res, next) => {
    try { res.json({ data: await salesInvoiceService.list(req.params.companyId, req.query) }); }
    catch (err) { next(err); }
  });

  router.post('/api/v1/companies/:companyId/sales-invoices', async (req, res, next) => {
    try { res.status(201).json({ data: await salesInvoiceService.createDraft(req.params.companyId, req.body) }); }
    catch (err) { next(err); }
  });

  router.get('/api/v1/companies/:companyId/sales-invoices/:id', async (req, res, next) => {
    try { res.json({ data: await salesInvoiceService.get(req.params.companyId, req.params.id) }); }
    catch (err) { next(err); }
  });

  router.post('/api/v1/companies/:companyId/sales-invoices/:id/post', async (req, res, next) => {
    try {
      res.json({ data: await salesPostingService.postSalesInvoice({
        company_id: req.params.companyId,
        invoice_id: req.params.id,
        posting_date: req.body.posting_date,
        idempotency_key: req.body.idempotency_key,
      }) });
    } catch (err) { next(err); }
  });

  router.post('/api/v1/companies/:companyId/sales-invoices/:id/cancel', async (req, res, next) => {
    try {
      res.json({ data: await salesPostingService.cancelSalesInvoice({
        company_id: req.params.companyId,
        invoice_id: req.params.id,
        cancellation_reason: req.body.cancellation_reason,
        idempotency_key: req.body.idempotency_key,
      }) });
    } catch (err) { next(err); }
  });
}

module.exports = { registerSalesInvoiceRoutes };
