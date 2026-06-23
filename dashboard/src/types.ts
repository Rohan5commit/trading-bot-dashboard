export interface Strategy {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  created_at: string;
}

export interface Report {
  id: number;
  strategy_id: number;
  report_date: string;
  subject: string;
  message_id: string;
  from_email: string;
  to_email: string;
  unrealized_pnl_pct: number | null;
  unrealized_pnl_abs: number | null;
  total_account_return_pct: number | null;
  open_positions: number | null;
  current_capital_estimate: number | null;
  raw_body: string;
  created_at: string;
}

export interface StrategyWithMetrics extends Strategy {
  latest_report_date: string | null;
  latest_unrealized_pnl_pct: number | null;
  latest_unrealized_pnl_abs: number | null;
  latest_total_account_return_pct: number | null;
  report_count: number;
  recent_pnl: { date: string; pnl: number }[];
}

export interface StrategyDetail extends Strategy {
  reports: Report[];
  avg_pnl_pct: number | null;
  avg_return_pct: number | null;
  best_pnl_pct: number | null;
  worst_pnl_pct: number | null;
}
