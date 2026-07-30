import imaplib
import email
from email.header import decode_header
from email.message import Message
from datetime import datetime, timedelta, timezone
from typing import Optional
import re
import os
import logging

logger = logging.getLogger(__name__)


def _decode_subject(raw_subject: str) -> str:
    decoded_parts = decode_header(raw_subject)
    parts = []
    for data, charset in decoded_parts:
        if isinstance(data, bytes):
            parts.append(data.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(data)
    return "".join(parts)


def _get_body(msg: Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            disp = str(part.get("Content-Disposition", ""))
            if ct == "text/plain" and "attachment" not in disp:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        for part in msg.walk():
            ct = part.get_content_type()
            disp = str(part.get("Content-Disposition", ""))
            if ct == "text/html" and "attachment" not in disp:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    html = payload.decode(charset, errors="replace")
                    return _strip_html(html)
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            raw = payload.decode(charset, errors="replace")
            if msg.get_content_type() == "text/html":
                return _strip_html(raw)
            return raw
    return ""


def _strip_html(html: str) -> str:
    text = re.sub(r"<br\s*/?\s*>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</(p|div|tr|li|h\d)>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class IMAPClient:
    def __init__(
        self,
        host: str,
        port: int,
        user: str,
        password: str,
        use_tls: bool = True,
    ):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.use_tls = use_tls
        self.conn: Optional[imaplib.IMAP4_SSL | imaplib.IMAP4] = None

    def connect(self):
        timeout = 30
        if self.use_tls:
            self.conn = imaplib.IMAP4_SSL(self.host, self.port, timeout=timeout)
        else:
            self.conn = imaplib.IMAP4(self.host, self.port, timeout=timeout)
        self.conn.login(self.user, self.password)
        logger.info("Connected to %s:%d as %s (timeout=%ds)", self.host, self.port, self.user, timeout)

    def close(self):
        if self.conn:
            try:
                self.conn.logout()
            except Exception:
                pass

    def fetch_matching_emails(
        self,
        subject_filters: list[str],
        lookback_days: int = 30,
    ) -> list[dict]:
        if not self.conn:
            raise RuntimeError("Not connected. Call connect() first.")

        self.conn.select("INBOX")

        since_date = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).strftime("%d-%b-%Y")

        all_results: list[dict] = []
        seen_uids: set[str] = set()

        for subject_pattern in subject_filters:
            safe_pattern = subject_pattern.replace('"', '\\"')
            search_criteria = f'(SINCE "{since_date}" SUBJECT "{safe_pattern}")'

            logger.info("Searching with criteria: %s", search_criteria)

            status, data = self.conn.search(None, search_criteria)
            if status != "OK":
                logger.warning("Search failed for pattern '%s': %s", subject_pattern, status)
                continue

            msg_nums = data[0].split()
            logger.info("Found %d messages for pattern '%s'", len(msg_nums), subject_pattern)

            for num in msg_nums:
                if num in seen_uids:
                    continue
                seen_uids.add(num)

                status, msg_data = self.conn.fetch(num, "(RFC822 UID)")
                if status != "OK":
                    continue

                raw_email = msg_data[0][1]
                uid = msg_data[0][0].decode() if isinstance(msg_data[0][0], bytes) else str(msg_data[0][0])

                msg = email.message_from_bytes(raw_email)

                subject = _decode_subject(msg["Subject"] or "")
                from_addr = msg.get("From", "")
                to_addr = msg.get("To", "")
                date_str = msg.get("Date", "")
                message_id = msg.get("Message-ID", f"<unknown-{num.decode()}>")
                body = _get_body(msg)

                all_results.append(
                    {
                        "uid": uid,
                        "message_id": message_id,
                        "subject": subject,
                        "from_email": from_addr,
                        "to_email": to_addr,
                        "date": date_str,
                        "body": body,
                    }
                )

        logger.info("Total unique emails fetched: %d", len(all_results))
        return all_results


def load_config_from_env() -> dict:
    return {
        "imap_host": os.environ.get("IMAP_HOST", "imap.gmail.com"),
        "imap_port": int(os.environ.get("IMAP_PORT", "993")),
        "imap_user": os.environ.get("SMTP_USER", ""),
        "imap_password": os.environ.get("SMTP_PASSWORD", ""),
        "imap_use_tls": os.environ.get("IMAP_USE_TLS", "true").lower() == "true",
        "subject_filters": [
            s.strip()
            for s in os.environ.get("SUBJECT_FILTERS", "").split(",")
            if s.strip()
        ],
        "lookback_days": int(os.environ.get("LOOKBACK_DAYS", "30")),
    }
