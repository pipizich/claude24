import sqlite3

def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    # Create artworks table if not exists
    conn.execute('''
    CREATE TABLE IF NOT EXISTS artworks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT NOT NULL,
        image_path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    conn.commit()

    # Add position column if not exists and initialize
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(artworks)")
    cols = [row[1] for row in cur.fetchall()]
    if 'position' not in cols:
        conn.execute('ALTER TABLE artworks ADD COLUMN position INTEGER')
        conn.execute('UPDATE artworks SET position = id')
        conn.commit()
    
    # Add indexes for better performance
    conn.execute('CREATE INDEX IF NOT EXISTS idx_position ON artworks(position)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON artworks(created_at)')
    conn.commit()
    conn.close()