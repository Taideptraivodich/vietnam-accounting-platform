# Windows Git Bash Compatibility Notes

## Python 3 detection

The patched runbook supports these Python launch forms:

```bash
python
python3
py -3
```

It also accepts an explicit override:

```bash
PYTHON_BIN="py -3" ./run_int01b_final_gate_local.sh
```

The runbook now invokes Python through a Bash argv array, so the observed Git Bash case `PYTHON_BIN="py -3"` is handled correctly instead of being treated as one executable named `py -3`.

If the Python executable path itself contains spaces, use a small wrapper script on PATH, for example:

```bash
mkdir -p local-bin
cat > local-bin/python <<'SH'
#!/usr/bin/env bash
exec py -3 "$@"
SH
chmod +x local-bin/python
PATH="$PWD/local-bin:$PATH" PYTHON_BIN=python ./run_int01b_final_gate_local.sh
```

## Docker and psql requirements

The runbook expects Docker and `psql` to be available in Git Bash. It starts PostgreSQL 16 on port `15432` with:

```text
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=local_final_gate
```

The resulting `DATABASE_URL` is used consistently for readiness, migrations, preseed, MD01 seed, and INT01A smoke:

```text
postgres://postgres:postgres@127.0.0.1:15432/local_final_gate
```
