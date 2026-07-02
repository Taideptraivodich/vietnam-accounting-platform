# Known Open Issues — MD01/EW01 Preseed v1.2

1. The package was assembled in an AI sandbox without Docker/psql, so live execution against clean PostgreSQL 16 is still a local gate responsibility.
2. The SQL targets the accepted current schema names `public.companies` and `public.accounts`. It intentionally does not include compatibility discovery for alternative table names, because the Final Gate migrations `001`–`007` establish those canonical tables.
3. If a local database already has an account with one of the required codes but wrong semantics, v1.2 fails closed instead of mutating it. That is intentional and preserves MD01/EW01 semantics.
4. GRNI default code is `3318`. Override with `MD01_PRESEED_GRNI_ACCOUNT_CODE` only if Senior/domain review explicitly changes the local baseline code.
