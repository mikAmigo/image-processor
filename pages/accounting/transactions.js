import { useState, useMemo } from 'react';
import Layout from '../../components/accounting/Layout';
import { useAccounting } from '../../utils/accountingStore';
import {
  formatCurrency, formatDate, todayISO,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES,
} from '../../utils/accountingHelpers';

const EMPTY_FORM = {
  date: todayISO(),
  description: '',
  amount: '',
  type: 'income',
  category: 'Service Revenue',
  reference: '',
  notes: '',
};

function Modal({ form, setForm, onSave, onClose, editing }) {
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (type) => {
    setForm(f => ({
      ...f,
      type,
      category: type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-semibold text-slate-800">{editing ? 'Edit Transaction' : 'New Transaction'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === 'expense' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Expense
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              placeholder="What was this for?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
            <input
              type="text"
              placeholder="REF-001"
              value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!form.description || !form.amount || !form.date}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {editing ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const { transactions, settings, loaded, addTransaction, updateTransaction, deleteTransaction } = useAccounting();

  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch]         = useState('');
  const [sortDir, setSortDir]       = useState('desc');
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = useMemo(() => {
    let rows = [...transactions];
    if (filterType !== 'all') rows = rows.filter(t => t.type === filterType);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.reference?.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => sortDir === 'desc'
      ? b.date?.localeCompare(a.date)
      : a.date?.localeCompare(b.date)
    );
    return rows;
  }, [transactions, filterType, search, sortDir]);

  const totals = useMemo(() => ({
    income:  filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
    expense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
  }), [filtered]);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditId(t.id);
    setForm({ date: t.date, description: t.description, amount: String(t.amount), type: t.type, category: t.category, reference: t.reference || '', notes: t.notes || '' });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.description || !form.amount || !form.date) return;
    const payload = { ...form, amount: parseFloat(form.amount) };
    if (editId) updateTransaction(editId, payload);
    else addTransaction(payload);
    setShowModal(false);
  };

  const handleDelete = (id) => {
    deleteTransaction(id);
    setConfirmDel(null);
  };

  if (!loaded) return <Layout title="Transactions"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout title="Transactions">
      {showModal && (
        <Modal
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          editing={!!editId}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDel(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Delete transaction?</h3>
            <p className="text-sm text-slate-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(confirmDel)} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-sm">
            {['all', 'income', 'expense'].map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3 py-2 capitalize transition-colors ${filterType === f ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
            title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
          >
            {sortDir === 'desc' ? '↓' : '↑'} Date
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <p className="text-xs text-emerald-700 mb-0.5">Filtered Income</p>
          <p className="font-bold text-emerald-700">{formatCurrency(totals.income, settings.currencySymbol)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-xs text-red-600 mb-0.5">Filtered Expenses</p>
          <p className="font-bold text-red-600">{formatCurrency(totals.expense, settings.currencySymbol)}</p>
        </div>
        <div className={`border rounded-xl px-4 py-3 ${totals.income - totals.expense >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
          <p className="text-xs text-slate-500 mb-0.5">Net</p>
          <p className={`font-bold ${totals.income - totals.expense >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            {formatCurrency(totals.income - totals.expense, settings.currencySymbol)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 text-sm">No transactions found.</p>
            <button onClick={openAdd} className="mt-3 text-indigo-600 text-sm hover:underline">Add your first transaction</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Reference</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 truncate max-w-xs">{t.description}</p>
                      {t.notes && <p className="text-xs text-slate-400 truncate max-w-xs">{t.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell whitespace-nowrap">{t.category}</td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{t.reference || '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, settings.currencySymbol)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => setConfirmDel(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400 text-right">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
    </Layout>
  );
}
