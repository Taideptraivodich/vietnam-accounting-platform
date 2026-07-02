# VALIDATION_REPORT.md — MD-01 Master Data Baseline P0 v1.0

## Result

Package created: `MD-01_MASTER_DATA_BASELINE_P0_v1_0.zip`

Static package validation: PASS.

Runtime PostgreSQL validation: NOT RUN in this workspace because no runnable integration repository or PostgreSQL service was supplied with this task.

## Scope validation

| Check | Result |
|---|---:|
| Creates `customers` table | PASS |
| Creates `suppliers` table | PASS |
| Creates `items` table | PASS |
| Creates `warehouses` table | PASS |
| Does not create `parties` | PASS |
| Does not create CRM tables | PASS |
| Does not create procurement/vendor-management tables | PASS |
| Does not create warehouse hierarchy/bin/advanced tables | PASS |
| Does not create batch/serial/pricing/planning tables | PASS |
| Does not add API/UI/business workflow | PASS |

## Schema validation

| Requirement | Implementation | Result |
|---|---|---:|
| `company_id` mandatory | `company_id UUID NOT NULL` on all 4 tables | PASS |
| No duplicate codes per company | `UNIQUE (company_id, code)` on all 4 tables | PASS |
| Account links use `accounts.id` | item account columns are UUID FKs to `accounts(id)` | PASS |
| Supports stock item mappings | stock-item CHECK requires inventory/COGS/revenue/expense accounts | PASS |
| No hard-coded account codes | seeder requires explicit `accounts.id` env vars | PASS |
| Company-scoped records | all records include `company_id`; indexes include company scope | PASS |

## Required test coverage mapping

| Required test | Covered by package | Notes |
|---|---:|---|
| 1. Create company | PARTIAL / external dependency | Company table/API is outside MD-01 scope. Validation asserts supplied companies exist. |
| 2. Create customer | YES | Seeder + validation SQL insert customer. |
| 3. Create supplier | YES | Seeder + validation SQL insert supplier. |
| 4. Create stock item with account mappings | YES | Seeder + validation SQL insert stock item with 4 account IDs. |
| 5. Create warehouse | YES | Seeder + validation SQL insert warehouse. |
| 6. Reject duplicate code per company | YES | Unique constraints; validation SQL includes duplicate rejection case. |
| 7. Ensure all records are company-scoped | YES | `company_id` required + same-code-across-company validation case. |

## Package integrity check

Generated files:

```text
README.md
package.json
migrations/001_md01_master_data_baseline.sql
seed_data/master_data_baseline.seed.json
seeders/seed_master_data_baseline.js
validation/README.md
validation/validate_md01_master_data_baseline.sql
VALIDATION_REPORT.md
OPEN_ISSUES.md
MANIFEST.md
```

## STOP condition

Baseline deliverables were created and no out-of-scope module/UI/business logic was opened.
