-- ================================================================
-- FinFlow — Complete Database Setup v2.0
-- PostgreSQL 14+
-- role -> ENUM type (user_role)
-- All timestamps -> TIMESTAMPTZ (UTC)
-- Soft delete -> status ENUM + deleted_at TIMESTAMPTZ + deleted_by FK
-- Run order: ENUM types -> tables -> indexes -> views -> seed data
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================= ENUM TYPES =============================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE account_status AS ENUM ('active', 'inactive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('income', 'expense');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_type') THEN
        CREATE TYPE category_type AS ENUM ('income', 'expense', 'both');
    END IF;
END $$;

-- ============================= USERS =============================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,          -- bcrypt hash
    role user_role NOT NULL DEFAULT 'user',  -- ENUM: engine-level check, no JOIN
    status account_status NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================= CATEGORIES =============================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    type category_type NOT NULL DEFAULT 'both',
    user_id INT REFERENCES users(id) ON DELETE CASCADE, -- NULL = global admin category
    status account_status NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cat_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_cat_status ON categories(status);
CREATE INDEX IF NOT EXISTS idx_cat_active ON categories(id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_cat_unique_user_name ON categories (COALESCE(user_id, 0), LOWER(name)) WHERE status = 'active';

-- ============================= TRANSACTIONS =============================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    type transaction_type NOT NULL,
    amount DECIMAL(14, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(255),
    date DATE NOT NULL,                      -- calendar date, not TIMESTAMPTZ: faster GROUP BY month
    status account_status NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_txn_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_txn_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_txn_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_txn_user_cat ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_txn_active ON transactions(user_id, date) WHERE status = 'active';

-- ============================= BUDGETS =============================
-- ============================= BUDGETS =============================
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_amount DECIMAL(14, 2) NOT NULL CHECK (limit_amount > 0),
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    status account_status NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_user_month
ON budgets(user_id, month, year);

CREATE INDEX IF NOT EXISTS idx_budget_active
ON budgets(user_id, month, year)
WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_user_cat_month_year_active
ON budgets(user_id, category_id, month, year)
WHERE status = 'active';
-- ============================= AUDIT_LOGS (append-only, sacred) =============================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_id INT REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(60),                  -- snapshot, survives actor deletion
    actor_role user_role,                    -- snapshot
    action VARCHAR(100) NOT NULL,            -- e.g. 'SOFT_DELETE_USER', 'ADD_TRANSACTION', 'LOGIN'
    target_table VARCHAR(50),
    target_id INT,
    detail TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_table, target_id);

-- ============================= VIEWS =============================
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT user_id,
    EXTRACT(YEAR FROM date)::INT AS year,
    EXTRACT(MONTH FROM date)::INT AS month,
    SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense,
    COUNT(*) AS txn_count
FROM transactions
WHERE status = 'active'
GROUP BY user_id, year, month;

CREATE OR REPLACE VIEW v_budget_utilisation AS
SELECT b.user_id, b.category_id, b.month, b.year, b.limit_amount,
    COALESCE(SUM(t.amount), 0) AS spent,
    ROUND(COALESCE(SUM(t.amount),0) / b.limit_amount * 100, 2) AS pct_used
FROM budgets b
LEFT JOIN transactions t
    ON t.user_id = b.user_id AND t.category_id = b.category_id
    AND t.type = 'expense' AND t.status = 'active'
    AND EXTRACT(MONTH FROM t.date) = b.month
    AND EXTRACT(YEAR FROM t.date) = b.year
WHERE b.status = 'active'
GROUP BY b.user_id, b.category_id, b.month, b.year, b.limit_amount;

CREATE OR REPLACE VIEW v_deleted_users AS
SELECT u.id, u.name, u.email, u.role, u.deleted_at,
    d.name AS deleted_by_name
FROM users u
LEFT JOIN users d ON d.id = u.deleted_by
WHERE u.status = 'inactive'
ORDER BY u.deleted_at DESC;

-- ============================= SEED DATA =============================
-- Passwords below are placeholders — the backend's utils/setupDb.js
-- reseeds admin/demo users with real bcrypt hashes at startup.
INSERT INTO categories (name, icon, type, user_id) VALUES
    ('Salary', 'money-bill', 'income', NULL),
    ('Freelance', 'laptop', 'income', NULL),
    ('Food', 'utensils', 'expense', NULL),
    ('Rent', 'home', 'expense', NULL),
    ('Transport', 'car', 'expense', NULL),
    ('Shopping', 'bag', 'expense', NULL),
    ('Medical', 'hospital', 'expense', NULL),
    ('Entertainment', 'film', 'expense', NULL),
    ('Investment', 'chart', 'income', NULL),
    ('Utilities', 'bolt', 'expense', NULL)
ON CONFLICT (COALESCE(user_id, 0), LOWER(name)) WHERE status = 'active' DO NOTHING;
