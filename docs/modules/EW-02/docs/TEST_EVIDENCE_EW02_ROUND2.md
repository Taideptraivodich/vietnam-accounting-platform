# EW-02 Round 2 Test Evidence

## Package harness added

Files:

```text
package.json
tsconfig.json
jest.config.cjs
src/...
tests/ar-ap.service.test.ts
```

Commands:

```bash
npm install
npm run verify
```

`npm run verify` executes:

```bash
npm run test:types && npm test
```

## Local static check performed in this workspace

Because this sandbox does not contain installed npm dependencies for Jest/Express, the following dependency-free TypeScript check was run against the core EW-02 files:

```bash
tsc --noEmit --target ES2020 --module CommonJS --moduleResolution Node --strict --skipLibCheck \
  src/types/ar-ap.types.ts \
  src/repositories/ar-ap-ledger.repository.ts \
  src/repositories/ar-ap-allocation.repository.ts \
  src/repositories/outstanding-cache.repository.ts \
  src/services/ar-ap.service.ts
```

Result:

```text
PASS — no TypeScript errors in core service/repository/types files.
```

A second local static check was also run on `tests/ar-ap.service.test.ts` using a temporary local Jest shim because npm dependencies are not installed in this sandbox. Result: `PASS`.

## Test coverage added/updated

- voucher posting passes same `tx` to EW-01 GL, AR/AP ledger, and voucher source update;
- caller-supplied `tx` is reused and no nested standalone transaction is opened;
- append-only allocation cancellation still inserts a negative cancellation event;
- migration evidence includes no-update/no-delete triggers for AR/AP event tables.
