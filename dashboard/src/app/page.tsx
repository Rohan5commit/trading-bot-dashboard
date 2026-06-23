"use client";

import { useEffect, useState } from "react";
import { StrategyTable } from "@/components/strategy-table";
import type { StrategyWithMetrics } from "@/types";

export default function Home() {
  const [strategies, setStrategies] = useState<StrategyWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [positiveOnly, setPositiveOnly] = useState(false);

  useEffect(() => {
    fetch("/api/strategies")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setStrategies(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Strategy Overview</h1>
        <p className="text-zinc-500 mt-1">
          Performance summary across all trading strategies
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-zinc-500">Loading strategies...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          Error loading data: {error}
        </div>
      )}

      {!loading && !error && (
        <StrategyTable
          strategies={strategies}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          positiveOnly={positiveOnly}
          onTogglePositive={() => setPositiveOnly(!positiveOnly)}
        />
      )}
    </div>
  );
}
