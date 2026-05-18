import pyodbc

try:
    conn = pyodbc.connect(
        "Driver={ODBC Driver 17 for SQL Server};"
        "Server=localhost;"
        "Database=master;"
        "Trusted_Connection=yes;"
    )
    print("SUCCESS: Connected to local MSSQL via Windows Auth.")
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
