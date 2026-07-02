#!/usr/bin/env python3
"""
MD01/EW01 deterministic local preseed v1.2.

Purpose:
  Create or select the local MD01 baseline company and required EW01 accounts
  using real PostgreSQL-generated UUIDs. The script writes a generated SQL file,
  executes it in one transaction, captures emitted MD01_* environment lines, and
  writes local-only readiness artifacts.

Scope:
  Local integration/preseed only. No production data, no fake IDs, and no bypass
  of MD01/EW01 account semantics.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List, Sequence

VERSION = "v1.2"
DEFAULT_SCHEMA = "public"
DEFAULT_COMPANY_CODE = "MD01LOCAL"
DEFAULT_COMPANY_NAME = "MD01 Local Integration Co"
DEFAULT_CURRENCY = "VND"

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

ENV_KEYS = [
    "MD01_COMPANY_ID",
    "MD01_INVENTORY_ACCOUNT_ID",
    "MD01_COGS_ACCOUNT_ID",
    "MD01_REVENUE_ACCOUNT_ID",
    "MD01_EXPENSE_ACCOUNT_ID",
    "MD01_GRNI_ACCOUNT_ID",
]


class Fatal(RuntimeError):
    pass


@dataclass(frozen=True)
class AccountBaseline:
    role: str
    env_key: str
    code_env: str
    default_code: str
    name: str
    account_type: str
    account_subtype: str
    normal_balance: str

    @property
    def key(self) -> str:
        return f"{self.role}_account_id"


BASELINE_ACCOUNTS: Sequence[AccountBaseline] = (
    AccountBaseline(
        role="inventory",
        env_key="MD01_INVENTORY_ACCOUNT_ID",
        code_env="MD01_PRESEED_INVENTORY_ACCOUNT_CODE",
        default_code="156",
        name="MD01 Inventory Asset Account",
        account_type="ASSET",
        account_subtype="merchandise_inventory",
        normal_balance="DEBIT",
    ),
    AccountBaseline(
        role="cogs",
        env_key="MD01_COGS_ACCOUNT_ID",
        code_env="MD01_PRESEED_COGS_ACCOUNT_CODE",
        default_code="632",
        name="MD01 Cost of Goods Sold Account",
        account_type="EXPENSE",
        account_subtype="cogs",
        normal_balance="DEBIT",
    ),
    AccountBaseline(
        role="revenue",
        env_key="MD01_REVENUE_ACCOUNT_ID",
        code_env="MD01_PRESEED_REVENUE_ACCOUNT_CODE",
        default_code="511",
        name="MD01 Sales Revenue Account",
        account_type="REVENUE",
        account_subtype="sales_revenue",
        normal_balance="CREDIT",
    ),
    AccountBaseline(
        role="expense",
        env_key="MD01_EXPENSE_ACCOUNT_ID",
        code_env="MD01_PRESEED_EXPENSE_ACCOUNT_CODE",
        default_code="642",
        name="MD01 Purchase Expense Fallback Account",
        account_type="EXPENSE",
        account_subtype="purchase_expense",
        normal_balance="DEBIT",
    ),
    AccountBaseline(
        role="grni",
        env_key="MD01_GRNI_ACCOUNT_ID",
        code_env="MD01_PRESEED_GRNI_ACCOUNT_CODE",
        default_code="3318",
        name="MD01 Goods Received Not Invoiced Account",
        account_type="LIABILITY",
        account_subtype="goods_received_not_invoiced",
        normal_balance="CREDIT",
    ),
)


def env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value


def qlit(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def qident(identifier: str) -> str:
    if not IDENT_RE.match(identifier):
        raise Fatal(f"Unsafe SQL identifier: {identifier!r}")
    return '"' + identifier.replace('"', '""') + '"'


def validate_code(value: str, label: str) -> str:
    if not re.match(r"^[A-Za-z0-9_.:/-]{1,32}$", value):
        raise Fatal(f"Invalid {label} {value!r}; expected 1-32 safe account-code characters.")
    return value


def validate_currency(value: str) -> str:
    if not re.match(r"^[A-Z]{3}$", value):
        raise Fatal(f"Invalid currency {value!r}; expected ISO-style 3 uppercase letters, for example VND.")
    return value


def statement_block(lines: Iterable[str]) -> str:
    return "\n".join(lines).rstrip() + "\n"


def build_sql(schema: str, company_code: str, company_name: str, currency: str) -> str:
    schema_q = qident(schema)
    companies = f"{schema_q}.\"companies\""
    accounts = f"{schema_q}.\"accounts\""
    uuid_regex_sql = qlit(UUID_RE.pattern)

    account_specs: list[tuple[AccountBaseline, str]] = []
    for account in BASELINE_ACCOUNTS:
        code = validate_code(env(account.code_env, account.default_code) or account.default_code, account.code_env)
        account_specs.append((account, code))

    sql: List[str] = []
    sql.extend(
        [
            "\\set ON_ERROR_STOP on",
            "\\pset tuples_only on",
            "\\pset format unaligned",
            "\\pset fieldsep ''",
            "BEGIN;",
            "SET LOCAL lock_timeout = '10s';",
            "SET LOCAL statement_timeout = '60s';",
            "SET LOCAL search_path = pg_catalog, public;",
            "",
            "-- MD01/EW01 deterministic local preseed v1.2.",
            "-- Verification failures are named with MD01_PRESEED_VERIFY_FAILED[...] errors.",
            "CREATE TEMP TABLE md01_preseed_ids (",
            "    key text PRIMARY KEY,",
            "    value uuid NOT NULL",
            ") ON COMMIT PRESERVE ROWS;",
            "",
            "CREATE OR REPLACE FUNCTION pg_temp.md01_preseed_assert(passed boolean, check_name text, details text)",
            "RETURNS void",
            "LANGUAGE plpgsql",
            "AS $assert$",
            "BEGIN",
            "    IF NOT COALESCE(passed, false) THEN",
            "        RAISE EXCEPTION USING",
            "            ERRCODE = 'P0001',",
            "            MESSAGE = format('MD01_PRESEED_VERIFY_FAILED[%s]: %s', check_name, details);",
            "    END IF;",
            "END",
            "$assert$;",
            "",
            "-- Create/select deterministic local integration company baseline.",
            "WITH pre_existing AS (",
            f"    SELECT id FROM {companies} WHERE code = {qlit(company_code)} ORDER BY id::text LIMIT 1",
            "), ins AS (",
            f"    INSERT INTO {companies} (code, name, is_active, created_at, updated_at)",
            f"    SELECT {qlit(company_code)}, {qlit(company_name)}, true, now(), now()",
            "    WHERE NOT EXISTS (SELECT 1 FROM pre_existing)",
            "    ON CONFLICT DO NOTHING",
            "    RETURNING id",
            "), post_existing AS (",
            f"    SELECT id FROM {companies} WHERE code = {qlit(company_code)} ORDER BY id::text LIMIT 1",
            ")",
            "INSERT INTO md01_preseed_ids(key, value)",
            "SELECT 'company_id', COALESCE((SELECT id FROM pre_existing), (SELECT id FROM ins), (SELECT id FROM post_existing))",
            "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;",
            "",
        ]
    )

    for account, code in account_specs:
        sql.extend(
            [
                f"-- Create/select deterministic {account.role} account baseline.",
                "WITH pre_existing AS (",
                f"    SELECT id FROM {accounts}",
                f"    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = {qlit(code)}",
                "    ORDER BY id::text LIMIT 1",
                "), ins AS (",
                f"    INSERT INTO {accounts} (",
                "        company_id, code, name, account_type, account_subtype, normal_balance,",
                "        currency, is_active, is_group, is_postable, created_at, updated_at",
                "    )",
                "    SELECT",
                "        (SELECT value FROM md01_preseed_ids WHERE key = 'company_id'),",
                f"        {qlit(code)},",
                f"        {qlit(account.name)},",
                f"        {qlit(account.account_type)},",
                f"        {qlit(account.account_subtype)},",
                f"        {qlit(account.normal_balance)},",
                f"        {qlit(currency)},",
                "        true, false, true, now(), now()",
                "    WHERE NOT EXISTS (SELECT 1 FROM pre_existing)",
                "    ON CONFLICT DO NOTHING",
                "    RETURNING id",
                "), post_existing AS (",
                f"    SELECT id FROM {accounts}",
                f"    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = {qlit(code)}",
                "    ORDER BY id::text LIMIT 1",
                ")",
                "INSERT INTO md01_preseed_ids(key, value)",
                f"SELECT {qlit(account.key)}, COALESCE((SELECT id FROM pre_existing), (SELECT id FROM ins), (SELECT id FROM post_existing))",
                "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;",
                "",
            ]
        )

    sql.extend(
        [
            "-- Named verification block. No division-by-zero sentinels are used.",
            "DO $verify$",
            "BEGIN",
            "    PERFORM pg_temp.md01_preseed_assert(",
            f"        EXISTS (SELECT 1 FROM {companies} c JOIN md01_preseed_ids i ON i.key = 'company_id' AND i.value = c.id WHERE c.code = {qlit(company_code)}),",
            "        'company.exists',",
            f"        'companies must contain code {company_code}'",
            "    );",
            "    PERFORM pg_temp.md01_preseed_assert(",
            f"        (SELECT value::text ~* {uuid_regex_sql} FROM md01_preseed_ids WHERE key = 'company_id'),",
            "        'company.uuid',",
            "        'MD01_COMPANY_ID must be a canonical PostgreSQL UUID; version/variant are intentionally not restricted'",
            "    );",
            "",
        ]
    )

    for account, code in account_specs:
        sql.extend(
            [
                f"    -- Verify {account.role} account baseline.",
                "    PERFORM pg_temp.md01_preseed_assert(",
                f"        EXISTS (SELECT 1 FROM {accounts} a JOIN md01_preseed_ids i ON i.key = {qlit(account.key)} AND i.value = a.id),",
                f"        '{account.role}.exists',",
                f"        '{account.env_key} must resolve to an accounts row for code {code}'",
                "    );",
                "    PERFORM pg_temp.md01_preseed_assert(",
                f"        (SELECT value::text ~* {uuid_regex_sql} FROM md01_preseed_ids WHERE key = {qlit(account.key)}),",
                f"        '{account.role}.uuid',",
                f"        '{account.env_key} must be a canonical PostgreSQL UUID; version/variant are intentionally not restricted'",
                "    );",
                "    PERFORM pg_temp.md01_preseed_assert(",
                f"        EXISTS (SELECT 1 FROM {accounts} a JOIN md01_preseed_ids i ON i.key = {qlit(account.key)} AND i.value = a.id WHERE a.company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id')),",
                f"        '{account.role}.company_id',",
                f"        '{account.env_key} must belong to MD01LOCAL company_id'",
                "    );",
                "    PERFORM pg_temp.md01_preseed_assert(",
                f"        EXISTS (SELECT 1 FROM {accounts} a JOIN md01_preseed_ids i ON i.key = {qlit(account.key)} AND i.value = a.id WHERE a.code = {qlit(code)}),",
                f"        '{account.role}.code',",
                f"        '{account.env_key} must use account code {code}'",
                "    );",
                "    PERFORM pg_temp.md01_preseed_assert(",
                f"        EXISTS (SELECT 1 FROM {accounts} a JOIN md01_preseed_ids i ON i.key = {qlit(account.key)} AND i.value = a.id WHERE a.account_type = {qlit(account.account_type)}),",
                f"        '{account.role}.account_type',",
                f"        '{account.env_key} must have account_type={account.account_type}'",
                "    );",
                "    PERFORM pg_temp.md01_preseed_assert(",
                f"        EXISTS (SELECT 1 FROM {accounts} a JOIN md01_preseed_ids i ON i.key = {qlit(account.key)} AND i.value = a.id WHERE a.account_subtype = {qlit(account.account_subtype)}),",
                f"        '{account.role}.account_subtype',",
                f"        '{account.env_key} must have non-null account_subtype={account.account_subtype}'",
                "    );",
                "    PERFORM pg_temp.md01_preseed_assert(",
                f"        EXISTS (SELECT 1 FROM {accounts} a JOIN md01_preseed_ids i ON i.key = {qlit(account.key)} AND i.value = a.id WHERE a.normal_balance = {qlit(account.normal_balance)}),",
                f"        '{account.role}.normal_balance',",
                f"        '{account.env_key} must have normal_balance={account.normal_balance}'",
                "    );",
                "    PERFORM pg_temp.md01_preseed_assert(",
                f"        EXISTS (SELECT 1 FROM {accounts} a JOIN md01_preseed_ids i ON i.key = {qlit(account.key)} AND i.value = a.id WHERE a.currency = {qlit(currency)}),",
                f"        '{account.role}.currency',",
                f"        '{account.env_key} must have currency={currency}'",
                "    );",
                "    PERFORM pg_temp.md01_preseed_assert(",
                f"        EXISTS (SELECT 1 FROM {accounts} a JOIN md01_preseed_ids i ON i.key = {qlit(account.key)} AND i.value = a.id WHERE a.is_active IS TRUE),",
                f"        '{account.role}.is_active',",
                f"        '{account.env_key} must be active'",
                "    );",
                "",
            ]
        )

    sql.extend(
        [
            "    PERFORM pg_temp.md01_preseed_assert(",
            "        (SELECT count(DISTINCT value) FROM md01_preseed_ids WHERE key IN ('inventory_account_id','cogs_account_id','revenue_account_id','expense_account_id','grni_account_id')) = 5,",
            "        'accounts.distinct',",
            "        'inventory, COGS, revenue, expense fallback, and GRNI accounts must be five distinct accounts'",
            "    );",
            "END",
            "$verify$;",
            "",
            "COMMIT;",
            "",
            "-- Clean exportable .env lines consumed by npm run seed:md01 / INT01A.",
            "SELECT env_line FROM (VALUES",
            "  (1, 'MD01_COMPANY_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'company_id')),",
            "  (2, 'MD01_INVENTORY_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'inventory_account_id')),",
            "  (3, 'MD01_COGS_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'cogs_account_id')),",
            "  (4, 'MD01_REVENUE_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'revenue_account_id')),",
            "  (5, 'MD01_EXPENSE_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'expense_account_id')),",
            "  (6, 'MD01_GRNI_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'grni_account_id'))",
            ") AS env(ordering, env_line) ORDER BY ordering;",
            "",
        ]
    )
    return statement_block(sql)


def parse_env_lines(output: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in output.splitlines():
        line = raw_line.strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key in ENV_KEYS:
            values[key] = value
    missing = [key for key in ENV_KEYS if key not in values]
    if missing:
        raise Fatal(
            "Preseed SQL did not emit all required MD01_* env lines. Missing: " + ", ".join(missing)
        )
    invalid = [f"{key}={value}" for key, value in values.items() if not UUID_RE.match(value)]
    if invalid:
        raise Fatal("Preseed SQL emitted invalid UUID values: " + ", ".join(invalid))
    return values


def write_env_file(path: Path, values: dict[str, str]) -> None:
    lines = [f"{key}={values[key]}" for key in ENV_KEYS]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        path.chmod(0o600)
    except OSError:
        pass


def write_json(path: Path, values: dict[str, str], database_url_present: bool) -> None:
    payload = {
        "package": "MD01_EW01_PRESEED_FIX_P0_v1_2",
        "version": VERSION,
        "status": "PASS",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "database_url_present": database_url_present,
        "ids": values,
        "semantics": {
            "company_code": DEFAULT_COMPANY_CODE,
            "required_accounts": [
                {
                    "role": account.role,
                    "env_key": account.env_key,
                    "code": env(account.code_env, account.default_code) or account.default_code,
                    "account_type": account.account_type,
                    "account_subtype": account.account_subtype,
                    "normal_balance": account.normal_balance,
                    "currency": env("MD01_PRESEED_CURRENCY", DEFAULT_CURRENCY) or DEFAULT_CURRENCY,
                }
                for account in BASELINE_ACCOUNTS
            ],
        },
    }
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_report(path: Path, values: dict[str, str], sql_path: Path, env_path: Path) -> None:
    rows = "\n".join(f"| `{key}` | `{values[key]}` |" for key in ENV_KEYS)
    report = f"""# MD01/EW01 Preseed Readiness Report — v1.2

## Status

PASS — generated IDs came from PostgreSQL rows created/selected by the v1.2 preseed transaction.

## Generated files

- SQL: `{sql_path}`
- Env: `{env_path}`
- JSON: `{path.with_name('md01_preseed_result.generated.json')}`

## Generated MD01 IDs

| Env var | Value |
|---|---|
{rows}

## Verification behavior

The v1.2 SQL uses named `MD01_PRESEED_VERIFY_FAILED[check.name]` exceptions. It does not use `ELSE (1/0)::text` sentinels.

The UUID check accepts any canonical PostgreSQL UUID text form and intentionally does not restrict UUID version or RFC variant nibbles.

## Required account semantics verified

| Role | account_type | account_subtype | normal_balance | currency |
|---|---|---|---|---|
| inventory | ASSET | merchandise_inventory | DEBIT | {env('MD01_PRESEED_CURRENCY', DEFAULT_CURRENCY) or DEFAULT_CURRENCY} |
| COGS | EXPENSE | cogs | DEBIT | {env('MD01_PRESEED_CURRENCY', DEFAULT_CURRENCY) or DEFAULT_CURRENCY} |
| revenue | REVENUE | sales_revenue | CREDIT | {env('MD01_PRESEED_CURRENCY', DEFAULT_CURRENCY) or DEFAULT_CURRENCY} |
| expense fallback | EXPENSE | purchase_expense | DEBIT | {env('MD01_PRESEED_CURRENCY', DEFAULT_CURRENCY) or DEFAULT_CURRENCY} |
| GRNI | LIABILITY | goods_received_not_invoiced | CREDIT | {env('MD01_PRESEED_CURRENCY', DEFAULT_CURRENCY) or DEFAULT_CURRENCY} |
"""
    path.write_text(report, encoding="utf-8")


def run_psql(database_url: str, sql_path: Path) -> str:
    psql = shutil.which("psql")
    if not psql:
        raise Fatal("psql was not found on PATH. Install PostgreSQL client tools or add psql to PATH.")
    cmd = [psql, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", database_url, "-f", str(sql_path)]
    proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        message = [f"psql failed with exit code {proc.returncode}."]
        if proc.stderr.strip():
            message.append("stderr:\n" + proc.stderr.strip())
        if proc.stdout.strip():
            message.append("stdout:\n" + proc.stdout.strip())
        raise Fatal("\n".join(message))
    return proc.stdout


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="MD01/EW01 deterministic local preseed v1.2")
    parser.add_argument("--output-dir", required=True, help="Directory for generated SQL/env/report artifacts")
    parser.add_argument("--database-url", default=None, help="PostgreSQL DATABASE_URL. Defaults to env DATABASE_URL.")
    parser.add_argument("--schema", default=None, help="Schema containing companies/accounts. Defaults to MD01_PRESEED_SCHEMA or public.")
    parser.add_argument("--print-generated-sql", action="store_true", help="Print generated SQL to stdout before execution")
    parser.add_argument("--no-execute", action="store_true", help="Generate artifacts only; do not run psql")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    try:
        output_dir = Path(args.output_dir).resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        schema = args.schema or env("MD01_PRESEED_SCHEMA", DEFAULT_SCHEMA) or DEFAULT_SCHEMA
        if not IDENT_RE.match(schema):
            raise Fatal(f"Invalid schema {schema!r}; use a simple PostgreSQL identifier such as public.")

        company_code = validate_code(env("MD01_PRESEED_COMPANY_CODE", DEFAULT_COMPANY_CODE) or DEFAULT_COMPANY_CODE, "company code")
        company_name = env("MD01_PRESEED_COMPANY_NAME", DEFAULT_COMPANY_NAME) or DEFAULT_COMPANY_NAME
        if len(company_name) > 255:
            raise Fatal("MD01_PRESEED_COMPANY_NAME exceeds 255 characters.")
        currency = validate_currency(env("MD01_PRESEED_CURRENCY", DEFAULT_CURRENCY) or DEFAULT_CURRENCY)

        sql = build_sql(schema=schema, company_code=company_code, company_name=company_name, currency=currency)
        sql_path = output_dir / "md01_ew01_preseed_v1_2.generated.sql"
        sql_path.write_text(sql, encoding="utf-8", newline="\n")

        if args.print_generated_sql:
            print(sql, end="")

        if args.no_execute:
            print(f"Generated SQL only: {sql_path}", file=sys.stderr)
            return 0

        database_url = args.database_url or env("DATABASE_URL")
        if not database_url:
            raise Fatal("DATABASE_URL is required. Export DATABASE_URL or pass --database-url.")

        stdout = run_psql(database_url, sql_path)
        values = parse_env_lines(stdout)

        env_path = output_dir / ".env.integration.generated"
        json_path = output_dir / "md01_preseed_result.generated.json"
        report_path = output_dir / "PRESEED_READINESS_REPORT.generated.md"
        psql_stdout_path = output_dir / "psql_env_output.generated.log"

        psql_stdout_path.write_text(stdout, encoding="utf-8")
        write_env_file(env_path, values)
        write_json(json_path, values, database_url_present=True)
        write_report(report_path, values, sql_path, env_path)

        for key in ENV_KEYS:
            print(f"{key}={values[key]}")
        print(f"[md01-preseed] wrote {env_path}", file=sys.stderr)
        print(f"[md01-preseed] wrote {report_path}", file=sys.stderr)
        return 0
    except Fatal as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
