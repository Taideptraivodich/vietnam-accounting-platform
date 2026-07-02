# LOCAL_DOCKER_POSTGRES_GUIDE_v1_0_3

Use this only on a local/dev machine with Docker. This is not a production database.

```bash
# Start disposable PostgreSQL
CONTAINER=accountant-erp-final-gate-pg
DB=accountant_erp_integration
USER=accountant_erp
PASS=accountant_erp
PORT=55432

docker rm -f "$CONTAINER" 2>/dev/null || true
docker run --name "$CONTAINER"   -e POSTGRES_USER="$USER"   -e POSTGRES_PASSWORD="$PASS"   -e POSTGRES_DB="$DB"   -p "$PORT:5432"   -d postgres:16

# Wait until ready
until docker exec "$CONTAINER" pg_isready -U "$USER" -d "$DB"; do sleep 1; done

export DATABASE_URL="postgres://$USER:$PASS@127.0.0.1:$PORT/$DB"
echo "$DATABASE_URL"

# After tests
docker rm -f "$CONTAINER"
```

Hard rules: no SQLite, no production DB, no fake URL, no MD-01 seed bypass.
