"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metric {
  user_id: string;
  username: string;
  completed_count: number;
  canceled_count: number;
}

export function CandidateLeaderboard({ metrics }: { metrics: Metric[] }) {
  // Sort by success rate then volume
  const sorted = [...metrics].sort((a, b) => {
    const rateA = a.completed_count / (a.completed_count + a.canceled_count || 1);
    const rateB = b.completed_count / (b.completed_count + b.canceled_count || 1);
    return rateB - rateA || b.completed_count - a.completed_count;
  });

  return (
    <div className="rounded-lg border border-[var(--mantis-border)] bg-[var(--mantis-paper)] shadow-[var(--mantis-shadow-card)]">
      <div className="px-6 pt-5 pb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--mantis-text)]">
          <Trophy size={18} className="text-amber-500" />
          Candidate performance
        </h2>
        <p className="mt-0.5 text-sm text-[var(--mantis-text-secondary)]">
          Distinguish successful contributors from unsuccessful ones.
        </p>
      </div>

      <div className="overflow-x-auto px-6 pb-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--mantis-border)] text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--mantis-text-secondary)]">
              <th className="py-3">Candidate</th>
              <th className="py-3">Completed ✅</th>
              <th className="py-3">Canceled ❌</th>
              <th className="py-3 text-right">Reliability Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((m) => {
              const total = m.completed_count + m.canceled_count;
              const rate = Math.round((m.completed_count / (total || 1)) * 100);

              return (
                <tr key={m.user_id} className="group transition-colors hover:bg-slate-50">
                  <td className="py-4">
                    <span className="font-medium text-slate-900">{m.username}</span>
                  </td>
                  <td className="py-4">
                    <span className="font-mono text-emerald-600">{m.completed_count}</span>
                  </td>
                  <td className="py-4">
                    <span className="font-mono text-red-600">{m.canceled_count}</span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          rate >= 80 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-600",
                        )}
                      >
                        {rate}%
                      </span>
                      <div className="h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={cn(
                            "h-full",
                            rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500",
                          )}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
