"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RevenueChart({ data }: { data: { month: string; total: number }[] }) {
  return (
    <div className="mt-4 h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} interval={0} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
          <Tooltip formatter={(value) => [`${Number(value ?? 0).toLocaleString("fr-FR")} €`, "CA"]} />
          <Bar dataKey="total" fill="var(--brand)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
