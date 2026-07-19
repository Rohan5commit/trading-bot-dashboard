import re
from datetime import datetime, date
from typing import Optional
import logging

logger = logging.getLogger(__name__)

STRATEGY_MAP = {
    "(Core)": {"name": "trading_bot_core", "display_name": "Trading Bot Core"},
    "(AI)": {"name": "trading_bot_ai", "display_name": "Trading Bot AI"},
    "kalshi sports bot": {"name": "kalshi_sports_bot", "display_name": "Kalshi Sports Bot"},
    "kronos report": {"name": "kronos", "display_name": "Kronos"},
    "microsoft trading bot": {"name": "microsoft_trading_bot", "display_name": "Microsoft Trading Bot"},
    "brain topology model": {"name": "brain_topology_model", "display_name": "Brain Topology Model"},
    "(Momentum)": {"name": "trading_bot_momentum", "display_name": "Trading Bot Momentum"},
    "(Value)": {"name": "trading_bot_value", "display_name": "Trading Bot Value"},
    "(Scalp)": {"name": "trading_bot_scalp", "display_name": "Trading Bot Scalp"},
}


def infer_strategy(subject: str) -> dict:
    for marker, info in STRATEGY_MAP.items():
        if marker.lower() in subject.lower():
            return info
    slug = re.sub(r"[^a-z0-9]+", "_", subject.split("-")[0].strip().lower()).strip("_")
    return {"name": slug, "display_name": slug.replace("_", " ").title()}


def extract_date_from_subject(subject: str) -> Optional[date]:
    match = re.search(r"(\d{4}-\d{2}-\d{2})", subject)
    if match:
        try:
            return datetime.strptime(match.group(1), "%Y-%m-%d").date()
        except ValueError:
            pass
    return None


def _parse_currency(value: str) -> Optional[float]:
    value = value.replace(",", "").replace("$", "").strip()
    if value.endswith("%"):
        value = value[:-1]
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _detect_error(body: str) -> bool:
    lines = body.split("\n")
    for line in lines:
        stripped = line.strip()
        # Skip empty lines and CSS/style lines
        if not stripped or stripped.startswith(("{", "}", ".", "#", "pre ", "body ", "h1", "h2", "table", "th ", "td ", "tr.", ".stat", ".pnl")):
            continue
        # Skip the "Errors" section header and "No errors" messages
        if re.match(r"^Errors$", stripped, re.IGNORECASE):
            continue
        if re.match(r"^No errors", stripped, re.IGNORECASE):
            continue
        # Detect actual error indicators
        if re.search(r"\bError\b", stripped) and not re.match(r"^No\s+error", stripped, re.IGNORECASE):
            return True
        if re.search(r"Traceback|NameError|ValueError|TypeError|KeyError|Exception|ImportError|RuntimeError", stripped):
            return True
    return False


def parse_report(subject: str, body: str) -> dict:
    result = {
        "strategy": infer_strategy(subject),
        "report_date": extract_date_from_subject(subject),
        "unrealized_pnl_pct": None,
        "unrealized_pnl_abs": None,
        "total_account_return_pct": None,
        "open_positions": None,
        "current_capital_estimate": None,
        "has_error": _detect_error(body),
    }

    patterns = [
        (
            r"Unrealized\s+P[&]?L(?:\s*\([^)]*\))?[:\s]*([-+]?\d+\.?\d*)\s*%\s*\(\$([-+]?\d[\d,]*\.?\d*)\)",
            lambda m: (
                result.__setitem__("unrealized_pnl_pct", float(m.group(1))),
                result.__setitem__("unrealized_pnl_abs", _parse_currency(m.group(2))),
            ),
        ),
        (
            r"Unrealized\s+P[&]?L(?:\s*\([^)]*\))?[:\s]*\$([-+]?\d[\d,]*\.?\d*)\s*\(([-+]?\d+\.?\d*)\s*%\)",
            lambda m: (
                result.__setitem__("unrealized_pnl_abs", _parse_currency(m.group(1))),
                result.__setitem__("unrealized_pnl_pct", float(m.group(2))),
            ),
        ),
        (
            r"Unrealized\s+P[&]?L(?:\s*\([^)]*\))?[:\s]*([-+]?\d[\d,]*\.?\d*)",
            lambda m: result.__setitem__("unrealized_pnl_abs", _parse_currency(m.group(1))),
        ),
    ]

    for pattern, extractor in patterns:
        match = re.search(pattern, body, re.IGNORECASE)
        if match and result["unrealized_pnl_pct"] is None and result["unrealized_pnl_abs"] is None:
            extractor(match)
            break

    # Fallback patterns for Microsoft Trading Bot format
    if result["unrealized_pnl_pct"] is None and result["unrealized_pnl_abs"] is None:
        msft_pnl_match = re.search(
            r"Total\s+P[&]?L[:\s]*\$?([-+]?\d[\d,]*\.?\d*)",
            body,
            re.IGNORECASE,
        )
        if msft_pnl_match:
            result["unrealized_pnl_abs"] = _parse_currency(msft_pnl_match.group(1))

        msft_return_match = re.search(
            r"Cumulative\s+Return[:\s]*([-+]?\d+\.?\d*)\s*%",
            body,
            re.IGNORECASE,
        )
        if msft_return_match:
            result["total_account_return_pct"] = float(msft_return_match.group(1))
            if result["unrealized_pnl_pct"] is None:
                result["unrealized_pnl_pct"] = float(msft_return_match.group(1))

    # Fallback patterns for Kalshi Sports Bot format (value on line above label)
    if result["unrealized_pnl_pct"] is None and result["unrealized_pnl_abs"] is None:
        kalshi_pnl_match = re.search(
            r"\$([-+]?\d[\d,]*\.?\d*)\s*\n\s*Demo\s+P[&]?L",
            body,
            re.IGNORECASE,
        )
        if kalshi_pnl_match:
            result["unrealized_pnl_abs"] = _parse_currency(kalshi_pnl_match.group(1))

        kalshi_return_match = re.search(
            r"([-+]?\d+\.?\d*)\s*%\s*\n\s*Return\s*\(vs[^)]*\)",
            body,
            re.IGNORECASE,
        )
        if kalshi_return_match:
            result["total_account_return_pct"] = float(kalshi_return_match.group(1))
            if result["unrealized_pnl_pct"] is None:
                result["unrealized_pnl_pct"] = float(kalshi_return_match.group(1))

    return_match = re.search(
        r"TOTAL\s+ACCOUNT\s+RETURN[:\s]*([-+]?\d+\.?\d*)\s*%",
        body,
        re.IGNORECASE,
    )
    if return_match:
        result["total_account_return_pct"] = float(return_match.group(1))

    open_pos_match = re.search(r"Open\s+Positions[:\s]*(\d+)", body, re.IGNORECASE)
    if open_pos_match:
        result["open_positions"] = int(open_pos_match.group(1))

    capital_match = re.search(
        r"(?:Current\s+)?(?:Capital\s+Estimate|Portfolio\s+Value)[:\s]*\$?([\d,]+\.?\d*)",
        body,
        re.IGNORECASE,
    )
    if capital_match:
        result["current_capital_estimate"] = _parse_currency(capital_match.group(1))

    date_match = re.search(r"Date[:\s]*(\d{4}-\d{2}-\d{2})", body, re.IGNORECASE)
    if date_match and result["report_date"] is None:
        try:
            result["report_date"] = datetime.strptime(date_match.group(1), "%Y-%m-%d").date()
        except ValueError:
            pass

    return result
