import { useMemo } from 'react';
import Link from 'next/link';
import Layout from '../../components/accounting/Layout';
import { useAccounting } from '../../utils/accountingStore';
import {
  formatCurrency, formatDateShort, getMonthlyData,
  getPeriodTotals, getCurrentMonthRange, getInvoiceSummary,
} from '../../utils/accountingHelpers';

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end gap-0.5" style={{ height: '112px' }}>
            <div
              className="flex-1 bg-emerald-400 rounded-t"
              style={{ height: `${(d.income / max) * 100}%`, minHeight: d.income > 0 ? 3 : 0 }}
              title={`Income: ${formatCurrency(d.income)}`}
            />
            <div
              className="flex-1 bg-red-400 rounded-t"
              style={{ height: `${(d.expense / max) * 100}%`, minHeight: d.expense > 0 ? 3 : 0 }}
              title={`Expenses: ${formatCurrency(d.expense)}`}
            />
          </div>
          <span className="text-xs text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { transactions, invoices, settings, loaded } = useAccounting();

  const { start, end } = getCurrentMonthRange();
  const mtd   = useMemo(() => getPeriodTotals(transactions, start, end), [transactions, start, end]);
  const chart  = useMemo(() => getMonthlyData(transactions, 6), [transactions]);
  const invSum = useMemo(() => getInvoiceSummary(invoices), [invoices]);
  const recent = useMemo(() =>
    [...transactions].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 8),
    [transactions]
  );

  if (!loaded) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Revenue (MTD)"
          value={formatCurrency(mtd.income, settings.currencySymbol)}
          sub="This month"
          color="bg-emerald-50"
          icon={<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>}
        />
        <StatCard
          label="Expenses (MTD)"
          value={formatCurrency(mtd.expense, settings.currencySymbol)}
          sub="This month"
          color="bg-red-50"
          icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>}
        />
        <StatCard
          label="Net Income (MTD)"
          value={formatCurrency(mtd.net, settings.currencySymbol)}
          sub={mtd.net >= 0 ? 'Profitable' : 'Net loss'}
          color={mtd.net >= 0 ? 'bg-blue-50' : 'bg-amber-50'}
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(invSum.sent + invSum.overdue, settings.currencySymbol)}
          sub={`${invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length} open invoices`}
          color="bg-violet-50"
          icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Monthly chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Revenue vs Expenses</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />Income</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Expenses</span>
            </div>
          </div>
          <BarChart data={chart} />
        </div>

        {/* Invoice summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Invoice Summary</h2>
            <Link href="/accounting/invoices" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Paid',    amount: invSum.paid,    count: invoices.filter(i => i.status === 'paid').length,    dot: 'bg-emerald-500' },
              { label: 'Pending', amount: invSum.sent,    count: invoices.filter(i => i.status === 'sent').length,    dot: 'bg-blue-500' },
              { label: 'Overdue', amount: invSum.overdue, count: invoices.filter(i => i.status === 'overdue').length, dot: 'bg-red-500' },
              { label: 'Draft',   amount: invSum.draft,   count: invoices.filter(i => i.status === 'draft').length,   dot: 'bg-slate-400' },
            ].map(({ label, amount, count, dot }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="text-xs text-slate-400">({count})</span>
                </div>
                <span className="text-sm font-medium text-slate-700">{formatCurrency(amount, settings.currencySymbol)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between">
            <span className="text-sm font-medium text-slate-700">Total</span>
            <span className="text-sm font-bold text-slate-800">{formatCurrency(invSum.total, settings.currencySymbol)}</span>
          </div>
          <Link
            href="/accounting/invoices"
            className="mt-4 block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            New Invoice
          </Link>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Recent Transactions</h2>
          <Link href="/accounting/transactions" className="text-xs text-indigo-600 hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {t.type === 'income'
                    ? <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                    : <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{t.description}</p>
                  <p className="text-xs text-slate-400">{t.category} · {formatDateShort(t.date)}</p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, settings.currencySymbol)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
