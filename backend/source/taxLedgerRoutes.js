/**
 * EW-06 VAT Ledger Query API
 *
 * GET /api/v1/companies/:companyId/tax-ledger-entries?from=&to=&taxDirection=input|output
 *
 * Query-only route. There is intentionally no POST/PUT/PATCH/DELETE route for
 * tax_ledger_entries; ledger writes happen only through the internal writer
 * service called from Sales/Purchase posting flows.
 */

const express = require('express');

function createTaxLedgerRouter(taxLedgerService) {
  const router = express.Router({ mergeParams: true });

  router.get('/companies/:companyId/tax-ledger-entries', async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const { from, to, taxDirection } = req.query;

      const entries = await taxLedgerService.queryEntries({
        companyId,
        from,
        to,
        taxDirection,
      });

      res.status(200).json({ data: entries });
    } catch (err) {
      if (err.message && err.message.includes('must be')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  return router;
}

module.exports = { createTaxLedgerRouter };
