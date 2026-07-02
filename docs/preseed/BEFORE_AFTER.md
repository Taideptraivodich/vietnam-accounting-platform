# Before / After — MD01/EW01 Preseed v1.1

## Before

```text
The v1.0 local preseed script handled company/accounts baseline IDs but did not explicitly map accounts.account_subtype.
If accounts.account_subtype was NOT NULL without default, insert safety checks failed before MD-01 seed.
The previous emitted env set did not include MD01_GRNI_ACCOUNT_ID.
```

## After

```text
The v1.1 script auto-detects account_subtype, or accepts MD01_PRESEED_ACCOUNT_SUBTYPE_COLUMN.
Every required baseline account insert includes a deterministic account_subtype value.
Selected/inserted accounts are verified for non-null matching account_subtype.
The script creates/selects a GRNI account baseline and emits MD01_GRNI_ACCOUNT_ID.
The psql invocation inside the Python runner now uses psql -d "$DATABASE_URL" semantics.
```

## Failure behavior

The patch fails closed when:

```text
DATABASE_URL is missing or looks production/remote.
company/account tables or required columns cannot be detected.
account_subtype exists but an enum label cannot be mapped to required subtype semantics.
existing baseline rows have missing or mismatched subtype values.
any emitted ID is not a database-returned UUID.
required account IDs are not distinct.
```
