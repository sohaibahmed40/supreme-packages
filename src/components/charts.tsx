"use client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

const COLORS = ["#E8A93C", "#1F2940", "#27AE60", "#E74C3C", "#2980B9", "#8E44AD", "#F39C12", "#16A085", "#D35400"];

function fmt(n: any) {
  if (typeof n !== "number") return n;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

const tooltipStyle = {
  backgroundColor: "#1F2940",
  border: "1px solid #2A3656",
  borderRadius: 8,
  color: "white",
  padding: "8px 12px",
};

export function IncomeExpenseChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => `PKR ${v.toLocaleString()}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" fill="#27AE60" name="Income" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expense" fill="#E74C3C" name="Expenses" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetTrendChart({ data }: { data: { month: string; net: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8A93C" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#E8A93C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `PKR ${v.toLocaleString()}`} />
        <Area type="monotone" dataKey="net" stroke="#E8A93C" strokeWidth={3}
              fill="url(#netGrad)" name="Net P/L" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={100}
          label={(d) => `${(d.percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `PKR ${v.toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopCounterpartiesBar({
  data, color = "#27AE60",
}: { data: { name: string; value: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `PKR ${v.toLocaleString()}`} />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CashPositionChart({ data }: { data: { date: string; balance: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2980B9" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#2980B9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `PKR ${v.toLocaleString()}`} />
        <Area type="monotone" dataKey="balance" stroke="#2980B9" strokeWidth={2}
              fill="url(#balGrad)" name="Balance" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
