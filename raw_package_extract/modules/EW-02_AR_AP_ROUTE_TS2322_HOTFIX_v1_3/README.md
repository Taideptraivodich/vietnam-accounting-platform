# EW-02 AR/AP Round 2 Revision v1.2

This package fixes EW-02 P0 Round 2 blockers:

- all AR/AP write repository methods are transaction-aware;
- service write flows use one Unit of Work, using caller `tx` or a standalone `AccountingTransactionManager`;
- `ar_ap_ledger_entries` and `ar_ap_allocations` have DB-level triggers that reject `UPDATE` and `DELETE`;
- allocation cancellation remains append-only via a negative cancellation event;
- package layout and TS/Jest harness are included.

## Run

```bash
npm install
npm run verify
```

## v1.3 P0 Hotfix — AR/AP Route TS2322

This package includes the EW-02 route-boundary TS2322 hotfix requested by senior review. The change is limited to normalizing Express params, headers and query values in `src/routes/ar-ap.routes.ts` before service DTO construction.

Evidence files:

- `docs/TS2322_ROUTE_BOUNDARY_HOTFIX.md`
- `docs/TEST_EVIDENCE_EW02_v1_3.md`

Validation commands run successfully:

- `npm install --ignore-scripts`
- `npm run verify`
- `npm test`

