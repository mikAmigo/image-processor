import { useState, useMemo } from 'react';
import Layout from '../../components/accounting/Layout';
import { useAccounting } from '../../utils/accountingStore';
import {
  formatCurrency, formatDate,
  getPeriodTotals, getCurrentMonthRange, getYearRange,
  groupByCategory, getInvoiceSummary,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES,
} from '../../utils/accountingHelpers';

const PERIODS = [
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Year',  value: 'thisYear' },
  { label: 'Last Year',  value: 'lastYear' },
  { label: 'Custom',     value: 'custom' },
];

function getRange(period, custom) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === 'thisMonth') {
    const s = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    return { start: s, end: `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}` };
  }
  if (period === 'lastMonth') {
    const lm = m === 0 ? 12 : m;
    const ly = m === 0 ? y - 1 : y;
    const lastDay = new Date(ly, lm, 0).getDate();
    return { start: `${ly}-${String(lm).padStart(2, '0')}-01`, end: `${ly}-${String(lm).padStart(2, '0')}-${lastDay}` };
  }
  if (period === 'thisYear') return getYearRange(y);
  if (period === 'lastYear') return getYearRange(y - 1);
  return custom;
}

function ReportSection({ title, rows, total, positive = true, sym }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-slate-400 text-sm pl-4 mb-3">No data</p>
      ) : (
        <div className="space-y-1 mb-3">
          {rows.map(([cat, data]) => (
            <div key={cat} className="flex items-center justify-between px-4 py-1.5 hover:bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">{cat}</span>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-700">{formatCurrency(data.total, sym)}</span>
                <span className="text-xs text-slate-400 ml-2">({data.count} txn{data.count !== 1 ? 's' : ''})</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between px-4 py-2 bg-slate-100 rounded-lg">
        <span className="text-sm font-semibold text-slate-700">Total {title}</span>
        <span className={`text-sm font-bold ${positive ? 'text-emerald-700' : 'text-red-600'}`}>
          {formatCurrency(total, sym)}
        </span>
      </div>
    </div>
  );
}

export default function Reports() {
  const { transactions, invoices, settings, accounts, loaded } = useAccounting();
  const [period, setPeriod] = useState('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeReport, setActiveReport] = useState('pl');

  const range = useMemo(() => getRange(period, { start: customStart, end: customEnd }), [period, customStart, customEnd]);
  const sym = settings.currencySymbol;

  const { transactions: filtered } = useMemo(() => getPeriodTotals(transactions, range.start, range.end), [transactions, range]);
  const totals = useMemo(() => getPeriodTotals(transactions, range.start, range.end), [transactions, range]);

  const incomeRows = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income');
    return Object.entries(groupByCategory(inc)).sort((a, b) => b[1].total - a[1].total);
  }, [filtered]);

  const expenseRows = useMemo(() => {
    const exp = filtered.filter(t => t.type === 'expense');
    return Object.entries(groupByCategory(exp)).sort((a, b) => b[1].total - a[1].total);
  }, [filtered]);

  const invSummary = useMemo(() => {
    const periodInvoices = invoices.filter(inv => inv.date >= (range.start || '') && inv.date <= (range.end || '9999'));
    return getInvoiceSummary(periodInvoices);
  }, [invoices, range]);

  // Balance sheet (all-time totals by account type)
  const balanceSheet = useMemo(() => {
    const allTotals = getPeriodTotals(transactions);
    const incomeTotal  = getPeriodTotals(transactions.filter(t => t.type === 'income')).income;
    const expenseTotal = getPeriodTotals(transactions.filter(t => t.type === 'expense')).expense;
    return {
      assets: {
        cash: allTotals.income - allTotals.expense,
        receivable: invSummary.sent + invSummary.overdue,
      },
      liabilities: { payable: 0 },
      equity: { retained: allTotals.net },
    };
  }, [transactions, invSummary]);

  if (!loaded) return <Layout title="Reports"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout title="Financial Reports">
      {/* Period selector */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Period:</span>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-2 transition-colors ${period === p.value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 text-sm">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <span className="text-slate-400">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          )}

          {range.start && (
            <span className="text-xs text-slate-400 ml-auto">
              {formatDate(range.start)} — {formatDate(range.end)}
            </span>
          )}

          <button onClick={() => window.print()} className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors print:hidden">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>
      </div>

      {/* Report tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 print:hidden">
        {[
          { id: 'pl', label: 'Profit & Loss' },
          { id: 'bs', label: 'Balance Sheet' },
          { id: 'inv', label: 'Invoice Report' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveReport(tab.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profit & Loss */}
      {activeReport === 'pl' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Profit & Loss Statement</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {range.start ? `${formatDate(range.start)} to ${formatDate(range.end)}` : 'All time'}
            </p>
          </div>
          <div className="px-6 py-5 space-y-6">
            <ReportSection title="Income" rows={incomeRows} total={totals.income} positive sym={sym} />
            <ReportSection title="Expenses" rows={expenseRows} total={totals.expense} positive={false} sym={sym} />

            {/* Net income */}
            <div className={`flex items-center justify-between px-4 py-4 rounded-xl border-2 ${totals.net >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
              <span className="font-bold text-slate-800">Net {totals.net >= 0 ? 'Income' : 'Loss'}</span>
              <span className={`text-xl font-bold ${totals.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(totals.net), sym)}
              </span>
            </div>

            {/* Margin */}
            {totals.income > 0 && (
              <div className="text-center text-sm text-slate-500">
                Profit margin: <span className={`font-semibold ${totals.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {((totals.net / totals.income) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {activeReport === 'bs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Balance Sheet</h2>
            <p className="text-sm text-slate-500 mt-0.5">Snapshot based on all recorded transactions</p>
          </div>
          <div className="px-6 py-5 grid md:grid-cols-2 gap-8">
            {/* Assets */}
            <div>
              <h3 className="font-semibold text-blue-700 text-sm uppercase tracking-wide mb-3">Assets</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm px-4 py-1.5 hover:bg-slate-50 rounded">
                  <span className="text-slate-600">Cash & Bank</span>
                  <span className="font-medium text-slate-700">{formatCurrency(Math.max(0, balanceSheet.assets.cash), sym)}</span>
                </div>
                <div className="flex justify-between text-sm px-4 py-1.5 hover:bg-slate-50 rounded">
                  <span className="text-slate-600">Accounts Receivable</span>
                  <span className="font-medium text-slate-700">{formatCurrency(balanceSheet.assets.receivable, sym)}</span>
                </div>
              </div>
              <div className="flex justify-between px-4 py-2 bg-blue-50 rounded-lg mt-2">
                <span className="text-sm font-semibold text-blue-700">Total Assets</span>
                <span className="text-sm font-bold text-blue-700">
                  {formatCurrency(Math.max(0, balanceSheet.assets.cash) + balanceSheet.assets.receivable, sym)}
                </span>
              </div>
            </div>

            {/* Liabilities + Equity */}
            <div>
              <h3 className="font-semibold text-red-600 text-sm uppercase tracking-wide mb-3">Liabilities</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm px-4 py-1.5 hover:bg-slate-50 rounded">
                  <span className="text-slate-600">Accounts Payable</span>
                  <span className="font-medium text-slate-700">{formatCurrency(0, sym)}</span>
                </div>
              </div>
              <div className="flex justify-between px-4 py-2 bg-red-50 rounded-lg mt-2">
                <span className="text-sm font-semibold text-red-600">Total Liabilities</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(0, sym)}</span>
              </div>

              <h3 className="font-semibold text-purple-700 text-sm uppercase tracking-wide mb-3 mt-6">Equity</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm px-4 py-1.5 hover:bg-slate-50 rounded">
                  <span className="text-slate-600">Retained Earnings</span>
                  <span className={`font-medium ${balanceSheet.equity.retained >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency(balanceSheet.equity.retained, sym)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between px-4 py-2 bg-purple-50 rounded-lg mt-2">
                <span className="text-sm font-semibold text-purple-700">Total Equity</span>
                <span className={`text-sm font-bold text-purple-700`}>
                  {formatCurrency(balanceSheet.equity.retained, sym)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Report */}
      {activeReport === 'inv' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Invoice Report</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {range.start ? `${formatDate(range.start)} to ${formatDate(range.end)}` : 'All time'}
            </p>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Invoiced', val: invSummary.total,   color: 'bg-slate-50 border-slate-200',    text: 'text-slate-700' },
                { label: 'Paid',           val: invSummary.paid,    color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
                { label: 'Outstanding',    val: invSummary.sent,    color: 'bg-blue-50 border-blue-100',       text: 'text-blue-700' },
                { label: 'Overdue',        val: invSummary.overdue, color: 'bg-red-50 border-red-100',         text: 'text-red-600' },
              ].map(({ label, val, color, text }) => (
                <div key={label} className={`border rounded-xl px-4 py-3 ${color}`}>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-xl font-bold ${text}`}>{formatCurrency(val, sym)}</p>
                </div>
              ))}
            </div>

            {/* Invoice list in period */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Client</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoices
                    .filter(inv => (!range.start || inv.date >= range.start) && (!range.end || inv.date <= range.end))
                    .sort((a, b) => b.date?.localeCompare(a.date))
                    .map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-indigo-600 font-medium">{inv.number}</td>
                        <td className="px-4 py-3 text-slate-700">{inv.client.name}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(inv.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${inv.status === 'paid'    ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'sent'    ? 'bg-blue-100 text-blue-800'
                            : inv.status === 'overdue' ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-600'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(inv.total, sym)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
