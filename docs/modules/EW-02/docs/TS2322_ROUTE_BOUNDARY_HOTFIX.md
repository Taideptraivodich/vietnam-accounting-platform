# EW-02 AR/AP Route TS2322 Hotfix v1.3

## Scope

This hotfix is limited to EW-02 route-boundary TypeScript narrowing in `src/routes/ar-ap.routes.ts`.

It does not change:

- AR/AP ledger schema.
- Allocation append-only behaviour.
- Core accounting posting/reversal contract.
- Journal or GL logic.
- AR/AP service accounting semantics.

## Blocker Fixed

`npm run verify` failed with TypeScript TS2322 errors because Express route values can be typed as `string | string[]` while EW-02 service DTOs require scalar `string` values.

Affected route-boundary sources:

- `req.params.companyId`
- `req.params.id`
- `req.headers['idempotency-key']`
- `req.query.partyId`
- `req.query.sourceDocumentId`
- `req.query.fromDate`
- `req.query.toDate`

## Implementation

Added local route helpers in `src/routes/ar-ap.routes.ts`:

- `requiredSingle(value, field): string`
- `optionalSingle(value, field): string | undefined`

The helpers normalize Express params, headers and query values before constructing service DTOs.

Route handlers now assign normalized local values before calling EW-02 service methods, for example:

```ts
const companyId = requiredSingle(req.params.companyId, 'companyId');
const voucherId = requiredSingle(req.params.id, 'id');
const idempotencyKey = requiredIdempotencyKey(req);
```

Query APIs normalize query fields with `optionalSingle(...)` and only pass scalar strings or `undefined` into service DTOs.

## Tests Added

Added `tests/ar-ap.routes.test.ts` covering:

- Required scalar params accept one non-empty string.
- Single-element string arrays are accepted.
- Missing/blank/multi-value/non-string required fields are rejected.
- Optional query/header fields accept absent values, scalar strings and single-element string arrays.
- Optional query/header fields reject multi-value and non-string values.

## Guardrail Confirmation

Only the following files were changed for v1.3:

- `src/routes/ar-ap.routes.ts`
- `tests/ar-ap.routes.test.ts`
- `package.json` metadata version/name/description only
- `docs/TS2322_ROUTE_BOUNDARY_HOTFIX.md`
- `docs/TEST_EVIDENCE_EW02_v1_3.md`

No migration files, repositories, service accounting logic, allocation model or GL integration code were changed.
