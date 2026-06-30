"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MonthlyPoint {
  month: string; // "YY.MM"
  count: number;
}

/**
 * 월별 안전활동 추이.
 * Bar 색은 currentColor → 부모의 text-primary(디자인 토큰)를 따른다(하드코딩 색 금지).
 */
export function MonthlyActivityChart({ data }: { data: MonthlyPoint[] }) {
  const empty = data.every((d) => d.count === 0);
  return (
    <div className="text-primary">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(value) => [`${value}건`, "안전활동"]}
          />
          <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
      {empty && (
        <p className="-mt-32 text-center text-sm text-muted-foreground">아직 기록된 활동이 없어요.</p>
      )}
    </div>
  );
}
