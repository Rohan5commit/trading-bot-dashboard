"use client";

import type { Report } from "@/types";

interface Props {
  report: Report;
  onClose: () => void;
}

export function EmailViewer({ report, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col border border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Email Report
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">{report.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-3 border-b border-zinc-800 text-sm space-y-1">
          <div>
            <span className="text-zinc-500">From:</span>{" "}
            <span className="text-zinc-300">{report.from_email}</span>
          </div>
          <div>
            <span className="text-zinc-500">To:</span>{" "}
            <span className="text-zinc-300">{report.to_email}</span>
          </div>
          <div>
            <span className="text-zinc-500">Date:</span>{" "}
            <span className="text-zinc-300">{report.report_date}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            {report.raw_body}
          </pre>
        </div>
      </div>
    </div>
  );
}
