function registerDeliveryNoteRoutes(router, { deliveryNoteService, salesPostingService }) {
  router.get('/api/v1/companies/:companyId/delivery-notes', async (req, res, next) => {
    try { res.json({ data: await deliveryNoteService.list(req.params.companyId, req.query) }); }
    catch (err) { next(err); }
  });

  router.post('/api/v1/companies/:companyId/delivery-notes', async (req, res, next) => {
    try { res.status(201).json({ data: await deliveryNoteService.createDraft(req.params.companyId, req.body) }); }
    catch (err) { next(err); }
  });

  router.get('/api/v1/companies/:companyId/delivery-notes/:id', async (req, res, next) => {
    try { res.json({ data: await deliveryNoteService.get(req.params.companyId, req.params.id) }); }
    catch (err) { next(err); }
  });

  router.post('/api/v1/companies/:companyId/delivery-notes/:id/post', async (req, res, next) => {
    try {
      res.json({ data: await salesPostingService.postDeliveryNote({
        company_id: req.params.companyId,
        delivery_note_id: req.params.id,
        posting_date: req.body.posting_date,
        idempotency_key: req.body.idempotency_key,
      }) });
    } catch (err) { next(err); }
  });

  router.post('/api/v1/companies/:companyId/delivery-notes/:id/cancel', async (req, res, next) => {
    try {
      res.json({ data: await salesPostingService.cancelDeliveryNote({
        company_id: req.params.companyId,
        delivery_note_id: req.params.id,
        cancellation_reason: req.body.cancellation_reason,
        idempotency_key: req.body.idempotency_key,
      }) });
    } catch (err) { next(err); }
  });
}

module.exports = { registerDeliveryNoteRoutes };
