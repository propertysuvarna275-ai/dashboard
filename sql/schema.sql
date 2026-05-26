-- Schema for Propel CRM using Neon/Postgres

CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('Admin', 'Manager', 'Marketing')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO users (id, name, email, password, role, active)
VALUES (
  'u-admin-default',
  'Administrator',
  'admin@propel.local',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'Admin',
  true
);

CREATE TABLE sessions (
  token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  whatsapp text NOT NULL,
  source text NOT NULL,
  first_follow_up date NOT NULL,
  status text NOT NULL CHECK (status IN ('Booking', 'Pending', 'Batal')),
  visited text NOT NULL CHECK (visited IN ('Sudah', 'Belum')),
  kavling text,
  result text,
  cancel_reason text,
  next_follow_up date,
  marketing text NOT NULL,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE client_history (
  id text PRIMARY KEY,
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL,
  note text NOT NULL,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
