# Clean Rerun Command

From a clean candidate directory on Windows Git Bash, copy or extract the patch files into the repository root and run:

```bash
./run_int01b_final_gate_local.sh
```

Optional overrides are available when needed:

```bash
PYTHON_BIN="py -3" ./run_int01b_final_gate_local.sh
```

```bash
PRESEED_SCRIPT=scripts/setup_md01_local_preseed.py ./run_int01b_final_gate_local.sh
```

The Docker PostgreSQL settings are used to derive the run DATABASE_URL. A stale pre-existing DATABASE_URL is ignored so every phase targets the same local container. Defaults:

```bash
POSTGRES_PORT=15432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=local_final_gate
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:15432/local_final_gate
```

The runbook removes and recreates its own local container name `local-final-gate-postgres-v105` to avoid stale database state. It does not touch production databases.
