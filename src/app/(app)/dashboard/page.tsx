import { getDashboardData } from "@/lib/queries";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IncomeExpenseChart, NetTrendChart, CategoryPie,
  TopCounterpartiesBar, CashPositionChart,
} from "@/components/charts";
import { formatPKR, formatPercent } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Wallet, Percent,
  Banknote, Users, Home, FileText, Upload,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Supreme Packages — Business Finance Overview
          </p>
        </div>
        <Link href="/upload">
          <Button variant="gold" size="lg">
            <Upload className="h-4 w-4 mr-2" />
            Upload Statement
          </Button>
        </Link>
      </div>

      {d.txnCount === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No transactions yet</h2>
            <p className="text-muted-foreground mb-6">
              Upload your first Meezan Bank statement to get started.
            </p>
            <Link href="/upload">
              <Button variant="gold" size="lg">
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Statement
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Income"     value={`PKR ${formatPKR(d.totalIncome)}`}  icon={TrendingUp} accent="green" />
            <KpiCard label="Total Expenses"   value={`PKR ${formatPKR(d.totalExpense)}`} icon={TrendingDown} accent="red" />
            <KpiCard label="Net Profit"       value={`PKR ${formatPKR(d.net)}`}          icon={Wallet}     accent={d.net >= 0 ? "green" : "red"} />
            <KpiCard label="Margin"           value={formatPercent(d.margin)}             icon={Percent}    accent="blue" />
            <KpiCard label="ATM Cash"         value={`PKR ${formatPKR(d.atmCash)}`}      icon={Banknote}   accent="amber" />
            <KpiCard label="Salaries Paid"    value={`PKR ${formatPKR(d.salaries)}`}     icon={Users}      accent="purple" />
            <KpiCard label="Factory Rent"     value={`PKR ${formatPKR(d.rent)}`}         icon={Home}       accent="navy" />
            <KpiCard label="Transactions"     value={`${d.txnCount}`}                     icon={FileText}   accent="gold" />
          </div>

          {/* Income vs Expense + Net Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <IncomeExpenseChart data={d.monthly} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Net Profit/Loss Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <NetTrendChart data={d.monthly} />
              </CardContent>
            </Card>
          </div>

          {/* Category breakdown + Cash position */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryPie data={d.categoryBreakdown} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Daily Bank Balance</CardTitle>
              </CardHeader>
              <CardContent>
                {d.cashPosition.length > 0 ? (
                  <CashPositionChart data={d.cashPosition} />
                ) : (
                  <p className="text-sm text-muted-foreground py-12 text-center">No balance data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top counterparties */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Income Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <TopCounterpartiesBar data={d.topIncome} color="#27AE60" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Expense Recipients</CardTitle>
              </CardHeader>
              <CardContent>
                <TopCounterpartiesBar data={d.topExpense} color="#E74C3C" />
              </CardContent>
            </Card>
          </div>

          {/* Monthly summary table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-3 py-3 font-medium">Month</th>
                      <th className="text-right px-3 py-3 font-medium">Income</th>
                      <th className="text-right px-3 py-3 font-medium">Expenses</th>
                      <th className="text-right px-3 py-3 font-medium">Net</th>
                      <th className="text-right px-3 py-3 font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {d.monthly.map((m, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 font-medium">{m.month}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-600">{formatPKR(m.income)}</td>
                        <td className="px-3 py-2.5 text-right text-red-600">{formatPKR(m.expense)}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold ${m.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatPKR(m.net)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-blue-600">
                          {formatPercent(m.income > 0 ? m.net / m.income : 0)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-brand-navy text-white font-bold">
                      <td className="px-3 py-3">TOTAL</td>
                      <td className="px-3 py-3 text-right">{formatPKR(d.totalIncome)}</td>
                      <td className="px-3 py-3 text-right">{formatPKR(d.totalExpense)}</td>
                      <td className="px-3 py-3 text-right text-brand-gold">{formatPKR(d.net)}</td>
                      <td className="px-3 py-3 text-right text-brand-gold">{formatPercent(d.margin)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
