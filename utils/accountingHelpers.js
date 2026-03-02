export const EXPENSE_CATEGORIES = [
  'Cost of Goods Sold',
  'Rent Expense',
  'Utilities',
  'Payroll',
  'Marketing',
  'Office Supplies',
  'Travel',
  'Professional Services',
  'Insurance',
  'Depreciation',
  'Bank Fees',
  'Other Expense',
];

export const INCOME_CATEGORIES = [
  'Sales Revenue',
  'Service Revenue',
  'Interest Income',
  'Rental Income',
  'Other Income',
];

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];

export const ACCOUNT_TYPE_LABELS = {
  asset:     'Assets',
  liability: 'Liabilities',
  equity:    'Equity',
  income:    'Income',
  expense:   'Expenses',
};

export function formatCurrency(amount, symbol = '$') {
  if (amount == null || isNaN(amount)) return `${symbol}0.00`;
  const n = Number(amount);
  return `${n < 0 ? '-' : ''}${symbol}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export function toInputDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return dt.toISOString().split('T')[0];
}

export function isOverdue(dueDate, status) {
  if (status === 'paid') return false;
  return dueDate < todayISO();
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getMonthlyData(transactions, months = 6) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const offset = months - 1 - i;
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mt = transactions.filter(t => t.date?.startsWith(prefix));
    const income  = mt.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = mt.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    return { label: MONTH_NAMES[d.getMonth()], income, expense, net: income - expense };
  });
}

export function getPeriodTotals(transactions, start, end) {
  const filtered = transactions.filter(t => {
    if (!t.date) return false;
    const d = t.date.split('T')[0];
    return (!start || d >= start) && (!end || d <= end);
  });
  const income  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  return { income, expense, net: income - expense, transactions: filtered };
}

export function getCurrentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
}

export function getYearRange(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function groupByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    const cat = t.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    acc[cat].total += t.amount || 0;
    acc[cat].count++;
    return acc;
  }, {});
}

export function getInvoiceSummary(invoices) {
  return invoices.reduce((acc, inv) => {
    acc.total   += inv.total || 0;
    acc[inv.status] = (acc[inv.status] || 0) + (inv.total || 0);
    return acc;
  }, { total: 0, paid: 0, sent: 0, overdue: 0, draft: 0 });
}

export function calcInvoiceTotals(items, taxRate) {
  const subtotal = items.reduce((s, item) => s + ((item.quantity || 0) * (item.rate || 0)), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case 'paid':    return 'bg-emerald-100 text-emerald-800';
    case 'sent':    return 'bg-blue-100 text-blue-800';
    case 'overdue': return 'bg-red-100 text-red-800';
    case 'draft':   return 'bg-gray-100 text-gray-600';
    default:        return 'bg-gray-100 text-gray-600';
  }
}

export function getAccountTypeColor(type) {
  switch (type) {
    case 'asset':     return 'text-blue-700 bg-blue-50';
    case 'liability': return 'text-red-700 bg-red-50';
    case 'equity':    return 'text-purple-700 bg-purple-50';
    case 'income':    return 'text-emerald-700 bg-emerald-50';
    case 'expense':   return 'text-orange-700 bg-orange-50';
    default:          return 'text-gray-700 bg-gray-50';
  }
}
