-- Trading Bot Dashboard Schema

CREATE TABLE IF NOT EXISTS strategies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    subject TEXT NOT NULL,
    message_id TEXT UNIQUE NOT NULL,
    from_email TEXT NOT NULL DEFAULT '',
    to_email TEXT NOT NULL DEFAULT '',
    unrealized_pnl_pct DOUBLE PRECISION,
    unrealized_pnl_abs DOUBLE PRECISION,
    total_account_return_pct DOUBLE PRECISION,
    open_positions INTEGER,
    current_capital_estimate NUMERIC(15, 2),
    raw_body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_strategy_id ON reports(strategy_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_date ON reports(report_date);
CREATE INDEX IF NOT EXISTS idx_reports_message_id ON reports(message_id);
