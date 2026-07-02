# EW-04 Round 3 Integration Cleanup Summary

## Senior Round 3 requirement

EW-04 previously looked for the legacy company-specific mapping table. Senior confirmed the canonical EW-01 resolver table is:

```text
account_mappings
```

EW-04 must use either the EW-01 account resolver contract or the canonical EW-01 table, and must not introduce or depend on the legacy company-specific mapping table unless a compatibility view is explicitly approved.

## Revision implemented

| Area | Round 3 change |
|---|---|
| Account resolver table | Replaced the legacy company-specific mapping table with canonical `account_mappings`. |
| Resolver method | Renamed internal mapping lookup from `_resolveFromCompanyMapping()` to `_resolveFromAccountMapping()`. |
| Error messages/docs | Updated ambiguity/remediation messages to point to `account_mappings`. |
| Tests | Added resolver-level tests proving `account_mappings` is queried, the legacy company-specific mapping table is not used, GRNI resolves `goods_received_not_invoiced`, and old `grni` subtype is rejected. |
| Metadata lookup hardening | `_getGRNIMetadataIfAvailable()` now defaults to `this.db` when called without an explicit transaction executor. |

## Preserved behavior

- `account_subtype = goods_received_not_invoiced`
- `account_id = accounts.id`
- VAT input GL composed by Purchase/EW-04
- Direct cash/bank PI creates no AP outstanding
- P1 direct-stock Purchase Invoice
- P2 Purchase Receipt before Purchase Invoice / GRNI clearing
