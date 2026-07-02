# Evidence Checklist

Each run writes evidence under:

```text
evidence/local_final_gate_v1_0_5/<RUN_ID>/
```

The runbook also attempts to create a sibling zip:

```text
evidence/local_final_gate_v1_0_5/<RUN_ID>.zip
```

The zip is created outside the evidence directory being zipped, avoiding recursive/nested evidence path errors.

Required evidence files:

- `console.log` — full runbook console log.
- `migrations.log` — ordered SQL migration application log for 001–007.
- `preseed-output.log` — MD01/EW01 preseed v1.2 console output with generated SQL printed.
- `.env.integration.generated` — generated env file emitted by preseed and copied into evidence.
- `final_gate_local_env_snapshot.sh` — exact env exported into `npm run seed:md01` and `npm run int01a:smoke`.
- `md01-seed.log` — MD01 seed output.
- `int01a-smoke-console.log` — INT01A smoke console output.
- `int01a-reports/` and/or `int01a-smoke-report.json` / `int01a-smoke-report.md` — INT01A JSON and Markdown report evidence when emitted by the runner.
- `first_failing_int01a_step.txt` — clear first failing INT01A step and error.
- `local_gate_summary.md` — summarized local gate status, first failing step, and evidence pointers.

Expected current real blocker until INT-01B v1.2 is applied:

```text
INT01A-05
companySettingsRepository is required
```
