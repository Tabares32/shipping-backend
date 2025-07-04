import sqlite3

DB_NAME = 'database.db'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS shippings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice TEXT NOT NULL,
            line INTEGER NOT NULL,
            part_number TEXT NOT NULL,
            shipping_date TEXT NOT NULL,
            observation TEXT,
            status TEXT
        )
    ''')
    conn.commit()
    conn.close()

def get_all_shippings():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM shippings")
    rows = cursor.fetchall()
    conn.close()
    return rows

def add_shipping(invoice, line, part_number, shipping_date, observation, status):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO shippings (invoice, line, part_number, shipping_date, observation, status) VALUES (?, ?, ?, ?, ?, ?)",
                   (invoice, line, part_number, shipping_date, observation, status))
    conn.commit()
    conn.close()