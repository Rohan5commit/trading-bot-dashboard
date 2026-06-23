"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Report } from "@/types";

interface Props {
  reports: Report[];
}

export function PnlChart({ reports }: Props) {
  const data = [...reports]
    .reverse()
    .map((r) => ({
      date: r.report_date,
      "Unrealized P&L ($)": r.unrealized_pnl_abs,
      "Total Return (%)": r.total_account_return_pct,
    }));

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        No data available for charting
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-zinc-700 mb-2">
          Unrealized P&L ($)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => `$${v.toLocaleString()}`}
              />
              <Tooltip
                formatter={(value) => [
                  `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  "P&L",
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="Unrealized P&L ($)"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-700 mb-2">
          Total Account Return (%)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(2)}%`, "Return"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="Total Return (%)"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
