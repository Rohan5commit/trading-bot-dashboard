#!/usr/bin/env python3
"""
Trading Bot Email Ingestion Worker

Connects to a mailbox via IMAP, fetches trading bot daily report emails,
parses PnL data, and upserts into Postgres.

Usage:
    python main.py              # Run one sync cycle
    python main.py --dry-run    # Parse but don't write to DB
"""
import os
import sys
import logging
import argparse
from dotenv import load_dotenv

from imap_client import IMAPClient, load_config_from_env
from parser import parse_report
from db import get_connection, ensure_strategy, upsert_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def run_sync(dry_run: bool = False):
    load_dotenv()
    config = load_config_from_env()

    if not config["imap_user"] or not config["imap_password"]:
        logger.error("SMTP_USER and SMTP_PASSWORD must be set.")
        sys.exit(1)
    if not config["subject_filters"]:
        logger.error("SUBJECT_FILTERS must be set (comma-separated list).")
        sys.exit(1)

    logger.info("Connecting to %s:%d", config["imap_host"], config["imap_port"])
    logger.info("Subject filters: %s", config["subject_filters"])
    logger.info("Lookback window: %d days", config["lookback_days"])

    client = IMAPClient(
        host=config["imap_host"],
        port=config["imap_port"],
        user=config["imap_user"],
        password=config["imap_password"],
        use_tls=config["imap_use_tls"],
    )

    try:
        client.connect()
        emails = client.fetch_matching_emails(
            subject_filters=config["subject_filters"],
            lookback_days=config["lookback_days"],
        )
        logger.info("Fetched %d emails", len(emails))

        if not emails:
            logger.info("No matching emails found.")
            return

        conn = None
        if not dry_run:
            conn = get_connection()

        parsed_count = 0
        error_count = 0

        for em in emails:
            try:
                parsed = parse_report(em["subject"], em["body"])
                parsed_count += 1

                logger.info(
                    "Parsed: subject='%s' strategy=%s date=%s pnl_pct=%s pnl_abs=%s return=%s",
                    em["subject"][:60],
                    parsed["strategy"]["name"],
                    parsed["report_date"],
                    parsed["unrealized_pnl_pct"],
                    parsed["unrealized_pnl_abs"],
                    parsed["total_account_return_pct"],
                )

                if conn:
                    strategy_id = ensure_strategy(
                        conn,
                        name=parsed["strategy"]["name"],
                        display_name=parsed["strategy"]["display_name"],
                    )
                    upsert_report(
                        conn,
                        strategy_id=strategy_id,
                        report_date=parsed["report_date"],
                        subject=em["subject"],
                        message_id=em["message_id"],
                        from_email=em["from_email"],
                        to_email=em["to_email"],
                        unrealized_pnl_pct=parsed["unrealized_pnl_pct"],
                        unrealized_pnl_abs=parsed["unrealized_pnl_abs"],
                        total_account_return_pct=parsed["total_account_return_pct"],
                        open_positions=parsed["open_positions"],
                        current_capital_estimate=parsed["current_capital_estimate"],
                        raw_body=em["body"],
                    )
                    logger.info("Upserted report for strategy '%s'", parsed["strategy"]["name"])

            except Exception as e:
                error_count += 1
                logger.error("Failed to process email '%s': %s", em.get("subject", "?"), e)

        if conn:
            conn.commit()
            conn.close()

        logger.info("Sync complete: %d parsed, %d errors", parsed_count, error_count)

    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser(description="Trading Bot Email Ingestion Worker")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse emails but don't write to database",
    )
    args = parser.parse_args()
    run_sync(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
