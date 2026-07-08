#!/usr/bin/env python3
"""Migrate PostgreSQL data to SQLite."""

import os, sqlite3, subprocess, json
from pathlib import Path

PG_URL = os.environ["DATABASE_URL"]
SQLITE_PATH = Path(os.environ.get("SQLITE_PATH", "./artifacts/api-server/edusaas.db"))

TABLES = [
    "tenants", "users", "subjects", "topics", "series", "classes",
    "class_students", "exams", "questions", "question_options",
    "exam_sessions", "student_answers", "activity_log",
    "guardians", "student_guardians", "parent_messages",
    "school_events", "parent_tips"
]

def psql_cols(table: str):
    cmd = [
        "psql", PG_URL, "-tA", "-F|",
        "-c", f"SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_name='{table}' ORDER BY ordinal_position;"
    ]
    out = subprocess.check_output(cmd, text=True).strip()
    if not out: return []
    return [line.split("|") for line in out.splitlines() if line.strip() and "|" in line]

def psql_rows(table: str, cols: list):
    # Use JSON format to avoid delimiter issues with special characters in data
    cmd = ["psql", PG_URL, "-tA", "-c", f"SELECT json_agg(row_to_json({table})) FROM {table};"]
    try:
        out = subprocess.check_output(cmd, text=True).strip()
    except subprocess.CalledProcessError:
        return []
    if not out or out == "": return []
    try:
        data = json.loads(out)
        if not isinstance(data, list): return []
        return data
    except json.JSONDecodeError:
        return []

def pg_to_sqlite_type(pg_type: str) -> str:
    t = pg_type.lower()
    if "int" in t or "serial" in t or "bool" in t: return "INTEGER"
    if "real" in t or "numeric" in t or "float" in t or "double" in t: return "REAL"
    if "timestamp" in t or "date" in t: return "TEXT"
    if "array" in t: return "TEXT"
    return "TEXT"

def convert_val(v, pg_type: str):
    if v is None or v == "": return None
    t = pg_type.lower()
    if isinstance(v, list):
        return json.dumps(v)
    if "bool" in t:
        return 1 if v in ("t", "true", "1", True) else 0
    if "int" in t or "serial" in t:
        try: return int(v)
        except: return None
    if "real" in t or "numeric" in t or "float" in t or "double" in t:
        try: return float(v)
        except: return None
    if "array" in t:
        # PostgreSQL arrays like {a,b,c}
        sv = str(v)
        if sv.startswith("{") and sv.endswith("}"):
            inner = sv[1:-1]
            if not inner: return "[]"
            items = inner.split(",")
            return json.dumps(items)
        return json.dumps([])
    return str(v)

def main():
    SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if SQLITE_PATH.exists(): SQLITE_PATH.unlink()

    SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.execute("PRAGMA foreign_keys=ON;")

    for table in TABLES:
        cols = psql_cols(table)
        if not cols:
            print(f"Skipping {table}: no columns found")
            continue

        col_defs = []
        col_names = []
        for c in cols:
            name, pg_type, nullable, default = c
            col_names.append(name)
            sqlite_type = pg_to_sqlite_type(pg_type)
            def_str = f'"{name}" {sqlite_type}'
            if nullable == "NO" and not default:
                def_str += " NOT NULL"
            if default and ("nextval" in default or "serial" in default.lower()):
                def_str += " PRIMARY KEY AUTOINCREMENT"
            elif name == "id":
                def_str += " PRIMARY KEY"
            col_defs.append(def_str)

        create_sql = f'CREATE TABLE "{table}" (\n' + ",\n".join(col_defs) + "\n);"
        conn.execute(create_sql)
        print(f"Created table: {table}")

        rows = psql_rows(table, cols)
        if not rows:
            print(f"  No data")
            continue

        placeholders = ",".join(["?"] * len(col_names))
        insert_sql = f'INSERT INTO "{table}" (' + ",".join([f'"{n}"' for n in col_names]) + f') VALUES ({placeholders})'
        cur = conn.cursor()
        for row in rows:
            vals = []
            for c in cols:
                pg_type = c[1]
                vals.append(convert_val(row.get(c[0]), pg_type))
            cur.execute(insert_sql, vals)
        conn.commit()
        print(f"  Inserted {len(rows)} rows")

    # Verify counts
    cur = conn.cursor()
    for table in TABLES:
        cur.execute(f'SELECT COUNT(*) FROM "{table}"')
        n = cur.fetchone()[0]
        print(f"{table}: {n} rows")

    conn.close()
    size = SQLITE_PATH.stat().st_size
    print(f"\nSQLite DB created: {SQLITE_PATH} ({size/1024/1024:.2f} MB)")

if __name__ == "__main__":
    main()
