# INT-01A Expected Environment

This file mirrors `EXPECTED_ENVIRONMENT_VARIABLES.md` for compatibility with the original dispatch naming.

Required:

```text
NODE_ENV=integration
DATABASE_URL=<real PostgreSQL URL>
MD01_COMPANY_ID=<real MD-01 company ID>
MD01_INVENTORY_ACCOUNT_ID=<real account ID>
MD01_COGS_ACCOUNT_ID=<real account ID>
MD01_REVENUE_ACCOUNT_ID=<real account ID>
MD01_EXPENSE_ACCOUNT_ID=<real account ID>
```

Approved surface binding:

```text
INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs
```

For full details, read `EXPECTED_ENVIRONMENT_VARIABLES.md`.
