# INT01B Open Issues

## Candidate API names may require env override

The dispatch identified likely service files but did not provide the full candidate implementation. The adapter includes conservative candidate path/export/method lists and optional env overrides.

If `npm run int01a:smoke` progresses beyond INT01A-04 and then reports a missing method, set the corresponding env override to the existing approved service method. Do not implement substitute business logic in this adapter.

## DB-backed smoke not run in packaging environment

The package was built from the dispatch zip only. The full candidate repo, Docker PostgreSQL runtime, migrations, MD01 preseed, and INT01A runner were not present in the packaging environment, so final smoke evidence must be captured by LOCAL-ASSEMBLY-01.

## No production merge authorization

This package resolves only the missing approved-surface binding blocker. It does not authorize production merge. Merge remains blocked until the full Final Integration Gate v1.0.3 passes.
