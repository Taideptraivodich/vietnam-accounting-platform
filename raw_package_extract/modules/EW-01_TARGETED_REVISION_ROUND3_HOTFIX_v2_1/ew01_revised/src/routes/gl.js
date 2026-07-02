'use strict';

const { Router } = require('express');
const { ValidationError, NotFoundError } = require('../services/PostingService');

/**
 * GL / Journal Entry routes.
 *
 * Business modules should call PostingService from their application service
 * inside their own Unit of Work. These HTTP endpoints are for manual/admin
 * accounting document flows only.
 */
function createGlRouter(postingService) {
  const router = Router({ mergeParams: true });

  const handle = fn => async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      if (err instanceof ValidationError || err instanceof NotFoundError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  };

  const companyId = req => req.params.companyId;

  // Required shared service contract exposed for admin/manual use.
  router.post('/accounting-documents/post', handle(async (req, res) => {
    const result = await postingService.postAccountingDocumentStandalone({
      ...req.body,
      company_id: req.body.company_id || companyId(req),
    });
    res.status(201).json(result);
  }));

  router.post('/accounting-documents/reverse', handle(async (req, res) => {
    const result = await postingService.reverseAccountingDocumentStandalone({
      ...req.body,
      company_id: req.body.company_id || companyId(req),
    });
    res.status(201).json(result);
  }));

  router.post('/journal-entries', handle(async (req, res) => {
    const result = await postingService.createDraft(companyId(req), req.body);
    res.status(201).json(result);
  }));

  router.patch('/journal-entries/:id', handle(async (req, res) => {
    const result = await postingService.updateDraft(companyId(req), req.params.id, req.body);
    res.json(result);
  }));

  router.get('/journal-entries/:id', handle(async (req, res) => {
    const result = await postingService.getJournalEntry(companyId(req), req.params.id);
    res.json(result);
  }));

  router.post('/journal-entries/:id/post', handle(async (req, res) => {
    const result = await postingService.post(companyId(req), req.params.id);
    res.json(result);
  }));

  router.post('/journal-entries/:id/cancel', handle(async (req, res) => {
    const result = await postingService.cancel(companyId(req), req.params.id, req.body);
    res.json(result);
  }));

  router.get('/gl-entries', handle(async (req, res) => {
    const { fromDate, toDate, accountId } = req.query;
    if (!fromDate || !toDate) return res.status(400).json({ error: 'fromDate and toDate are required.' });
    const entries = await postingService.queryGlEntries(companyId(req), { fromDate, toDate, accountId });
    res.json(entries);
  }));

  router.get('/trial-balance', handle(async (req, res) => {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) return res.status(400).json({ error: 'fromDate and toDate are required.' });
    const result = await postingService.trialBalance(companyId(req), fromDate, toDate);
    res.json(result);
  }));

  return router;
}

module.exports = createGlRouter;
