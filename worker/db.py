import os
import logging
from datetime import date
from typing import Optional
import psycopg2
import psycopg2.extras

logger = logging.getLogger(__name__)


def get_connection():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ensure_strategy(conn, name: str, display_name: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO strategies (name, display_name) VALUES (%s, %s) ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id",
            (name, display_name),
        )
        return cur.fetchone()[0]


def upsert_report(
    conn,
    strategy_id: int,
    report_date: date,
    subject: str,
    message_id: str,
    from_email: str,
    to_email: str,
    unrealized_pnl_pct: Optional[float],
    unrealized_pnl_abs: Optional[float],
    total_account_return_pct: Optional[float],
    open_positions: Optional[int],
    current_capital_estimate: Optional[float],
    raw_body: str,
):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO reports (
                strategy_id, report_date, subject, message_id,
                from_email, to_email,
                unrealized_pnl_pct, unrealized_pnl_abs,
                total_account_return_pct, open_positions,
                current_capital_estimate, raw_body
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s
            )
            ON CONFLICT (message_id) DO UPDATE SET
                report_date = EXCLUDED.report_date,
                subject = EXCLUDED.subject,
                from_email = EXCLUDED.from_email,
                to_email = EXCLUDED.to_email,
                unrealized_pnl_pct = EXCLUDED.unrealized_pnl_pct,
                unrealized_pnl_abs = EXCLUDED.unrealized_pnl_abs,
                total_account_return_pct = EXCLUDED.total_account_return_pct,
                open_positions = EXCLUDED.open_positions,
                current_capital_estimate = EXCLUDED.current_capital_estimate,
                raw_body = EXCLUDED.raw_body
            """,
            (
                strategy_id,
                report_date,
                subject,
                message_id,
                from_email,
                to_email,
                unrealized_pnl_pct,
                unrealized_pnl_abs,
                total_account_return_pct,
                open_positions,
                current_capital_estimate,
                raw_body,
            ),
        )
        return cur.rowcount
