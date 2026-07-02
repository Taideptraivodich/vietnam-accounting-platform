# GitHub Staging Hardening Checklist v1.0.3

## Required before opening production release discussion

- [ ] Confirm branch is `staging/v1.0.3-final-gate-pass`.
- [ ] Confirm production branches are protected.
- [ ] Add `.github/workflows/staging-ci.yml`.
- [ ] Run `scripts/regenerate_checksums.sh`.
- [ ] Move stale fail reports to `reports/history/` if needed.
- [ ] Add `docs/CANONICAL_PASS_EVIDENCE_v1_0_3.md`.
- [ ] Confirm `INT01A_FINAL_PASS.json` remains unchanged.
- [ ] Confirm `INT01A_FINAL_PASS.md` remains unchanged.
- [ ] Confirm `NO_PRODUCTION_MERGE_STATEMENT.md` remains present.
- [ ] Commit only CI/docs/checksum cleanup unless Senior approves otherwise.
- [ ] If executable files change, rerun Final Integration Gate v1.0.3.

## Still not allowed

- [ ] No merge to main/master/production.
- [ ] No P1/P2 scope.
- [ ] No architecture changes.
- [ ] No production release tag.
