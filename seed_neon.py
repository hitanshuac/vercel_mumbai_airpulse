#!/usr/bin/env python3
"""
seed_neon.py
============
Connects to Neon Serverless Postgres via DATABASE_URL and executes neon_schema_and_seed.sql.
"""
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("=" * 70)
    print("DATABASE_URL environment variable is not set.")
    print("To seed your Neon database:")
    print("  1. Copy your connection string from the Neon Console")
    print("  2. In your terminal run:")
    print('     export DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"')
    print("     python seed_neon.py")
    print("=" * 70)
    sys.exit(0)

sql_file = Path(__file__).parent / "neon_schema_and_seed.sql"
if not sql_file.exists():
    print(f"Error: {sql_file} not found.")
    sys.exit(1)

print(f"Connecting to Neon Postgres...")
try:
    import psycopg2
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    print("Connected successfully. Executing SQL schema and seed batch...")
    with open(sql_file, "r", encoding="utf-8") as f:
        sql_content = f.read()
    cursor.execute(sql_content)
    cursor.close()
    conn.close()
    print("SUCCESS: Neon Serverless Database seeded with 32 stations, 768 telemetry rows & KPIs!")
except ImportError:
    try:
        import psycopg
        with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
            with conn.cursor() as cur:
                with open(sql_file, "r", encoding="utf-8") as f:
                    cur.execute(f.read())
        print("SUCCESS: Neon Serverless Database seeded via psycopg3!")
    except ImportError:
        try:
            import pg8000.native
            import ssl
            ctx = ssl.create_default_context()
            # Parse connection details from DATABASE_URL
            import urllib.parse
            parsed = urllib.parse.urlparse(DATABASE_URL)
            conn = pg8000.native.Connection(
                user=parsed.username,
                password=parsed.password,
                host=parsed.hostname,
                port=parsed.port or 5432,
                database=parsed.path.lstrip('/'),
                ssl_context=ctx
            )
            with open(sql_file, "r", encoding="utf-8") as f:
                sql_content = f.read()
            statements = [s.strip() for s in sql_content.split(';\n') if s.strip()]
            for stmt in statements:
                if stmt:
                    conn.run(stmt + ';')
            conn.close()
            print("SUCCESS: Neon Serverless Database seeded via pg8000!")
        except ImportError:
            print("Neither psycopg2, psycopg, nor pg8000 is installed. You can execute neon_schema_and_seed.sql directly inside the Neon Console SQL Editor in 1 click!")
