# MANIFEST.md

Package: `MD-01_MASTER_DATA_BASELINE_P0_v1_0.zip`

## Deliverables

- Seed Data: `seed_data/master_data_baseline.seed.json`
- Migration: `migrations/001_md01_master_data_baseline.sql`
- Seeder: `seeders/seed_master_data_baseline.js`
- Validation report: `VALIDATION_REPORT.md`
- Open issues: `OPEN_ISSUES.md`

## Scope lock

Only baseline master-data tables are included:

```text
customers
suppliers
items
warehouses
```

No UI. No APIs. No business logic. No advanced inventory or commercial features.
