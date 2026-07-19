import { Pool } from "pg";
import type { StrategyWithMetrics, StrategyDetail, Report } from "@/types";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getAllStrategies(): Promise<StrategyWithMetrics[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      WITH latest_reports AS (
        SELECT
          strategy_id,
          report_date,
          unrealized_pnl_pct,
          unrealized_pnl_abs,
          total_account_return_pct,
          has_error,
          ROW_NUMBER() OVER (PARTITION BY strategy_id ORDER BY report_date DESC) AS rn
        FROM reports
      ),
      strategy_stats AS (
        SELECT
          strategy_id,
          COUNT(*) AS report_count
        FROM reports
        GROUP BY strategy_id
      )
      SELECT
        s.id,
        s.name,
        s.display_name,
        s.description,
        s.created_at,
        lr.report_date AS latest_report_date,
        lr.unrealized_pnl_pct AS latest_unrealized_pnl_pct,
        lr.unrealized_pnl_abs AS latest_unrealized_pnl_abs,
        lr.total_account_return_pct AS latest_total_account_return_pct,
        lr.has_error,
        COALESCE(ss.report_count, 0) AS report_count
      FROM strategies s
      LEFT JOIN latest_reports lr ON lr.strategy_id = s.id AND lr.rn = 1
      LEFT JOIN strategy_stats ss ON ss.strategy_id = s.id
      ORDER BY s.display_name
    `);

    const strategies: StrategyWithMetrics[] = [];

    for (const row of result.rows) {
      const recentResult = await client.query(
        `SELECT report_date, unrealized_pnl_abs
         FROM reports
         WHERE strategy_id = $1
         ORDER BY report_date DESC
         LIMIT 10`,
        [row.id]
      );

      strategies.push({
        ...row,
        recent_pnl: recentResult.rows
          .reverse()
          .map((r) => ({
            date: r.report_date,
            pnl: r.unrealized_pnl_abs ?? 0,
          })),
      });
    }

    return strategies;
  } finally {
    client.release();
  }
}

export async function getStrategyById(id: number): Promise<StrategyDetail | null> {
  const client = await pool.connect();
  try {
    const strategyResult = await client.query(
      "SELECT * FROM strategies WHERE id = $1",
      [id]
    );
    if (strategyResult.rows.length === 0) return null;
    const strategy = strategyResult.rows[0];

    const reportsResult = await client.query(
      `SELECT * FROM reports WHERE strategy_id = $1 ORDER BY report_date DESC`,
      [id]
    );
    const reports: Report[] = reportsResult.rows;

    const statsResult = await client.query(
      `SELECT
        AVG(unrealized_pnl_pct) AS avg_pnl_pct,
        AVG(total_account_return_pct) AS avg_return_pct,
        MAX(unrealized_pnl_pct) AS best_pnl_pct,
        MIN(unrealized_pnl_pct) AS worst_pnl_pct
      FROM reports WHERE strategy_id = $1`,
      [id]
    );
    const stats = statsResult.rows[0];

    return {
      ...strategy,
      reports,
      avg_pnl_pct: stats.avg_pnl_pct,
      avg_return_pct: stats.avg_return_pct,
      best_pnl_pct: stats.best_pnl_pct,
      worst_pnl_pct: stats.worst_pnl_pct,
    };
  } finally {
    client.release();
  }
}

export async function getReportById(reportId: number): Promise<Report | null> {
  const result = await pool.query("SELECT * FROM reports WHERE id = $1", [reportId]);
  return result.rows[0] ?? null;
}
