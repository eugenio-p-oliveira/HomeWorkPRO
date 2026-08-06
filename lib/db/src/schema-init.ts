type SqliteExecutor = {
  exec(statement: string): unknown;
};

/**
 * The published API can start with a fresh SQLite file because the local
 * database file is not part of the deployment artifact. Create the current
 * schema in place without dropping or replacing an existing database.
 */
export function ensureSqliteSchema(sqlite: SqliteExecutor): void {
  sqlite.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      primary_color TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      educational_levels TEXT NOT NULL DEFAULT '[]',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      avatar_url TEXT,
      registration_number TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      educational_level TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      serie_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      shift TEXT NOT NULL,
      year INTEGER NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS class_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      enrolled_at TEXT
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      time_limit_minutes INTEGER,
      starts_at TEXT,
      ends_at TEXT,
      max_attempts INTEGER,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      is_public INTEGER NOT NULL DEFAULT 0,
      show_result_immediately INTEGER NOT NULL DEFAULT 1,
      created_by_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      statement TEXT NOT NULL,
      explanation TEXT,
      topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
      points REAL NOT NULL DEFAULT 1,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS question_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      letter TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      started_at TEXT,
      submitted_at TEXT,
      ends_at TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      score REAL,
      max_score REAL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS student_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      selected_option_id INTEGER REFERENCES question_options(id) ON DELETE SET NULL,
      is_correct INTEGER,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS guardians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS student_guardians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      guardian_id INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
      relation TEXT NOT NULL DEFAULT 'parent',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS parent_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      guardian_id INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'custom_message',
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS school_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT NOT NULL DEFAULT 'other',
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      is_all_day INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS parent_tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT
    );
  `);
}