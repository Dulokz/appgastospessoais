"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrencyBRL } from "@/lib/decimal";

interface SnapshotPoint {
  dateStr: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

interface AllocationPoint {
  name: string;
  value: number;
  color: string;
}

interface NetWorthChartsProps {
  history: SnapshotPoint[];
  allocations: AllocationPoint[];
}

export function NetWorthCharts({ history, allocations }: NetWorthChartsProps) {
  const [period, setPeriod] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("6M");

  const filteredHistory = history.filter((item, idx) => {
    if (period === "1M") return idx >= history.length - 1;
    if (period === "3M") return idx >= history.length - 3;
    if (period === "6M") return idx >= history.length - 6;
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Gráfico de Evolução Temporal */}
      <div className="lg:col-span-2 glass-card p-5 rounded-2xl flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Evolução do Patrimônio Líquido</h3>
            <p className="text-xs text-muted-foreground">Crescimento histórico de ativos vs. passivos</p>
          </div>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  period === p
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {p === "ALL" ? "Tudo" : p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <XAxis dataKey="dateStr" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as SnapshotPoint;
                    return (
                      <div className="glass-panel p-3 rounded-xl border border-white/10 shadow-xl text-xs space-y-1">
                        <p className="font-bold text-white mb-1">{data.dateStr}</p>
                        <p className="text-emerald-400 font-semibold">
                          Patrimônio Líquido: {formatCurrencyBRL(data.netWorth)}
                        </p>
                        <p className="text-cyan-400">Ativos Totais: {formatCurrencyBRL(data.totalAssets)}</p>
                        <p className="text-rose-400">Passivos: {formatCurrencyBRL(data.totalLiabilities)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorNetWorth)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Rosca de Alocação */}
      <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Composição Patrimonial</h3>
          <p className="text-xs text-muted-foreground">Distribuição entre liquidez, ativos e dívidas</p>
        </div>

        <div className="h-64 w-full my-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocations}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {allocations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrencyBRL(value)}
                contentStyle={{ background: "#0f172a", borderRadius: "0.75rem", borderColor: "#334155" }}
              />
              <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
