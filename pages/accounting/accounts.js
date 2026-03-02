import { useState, useMemo } from 'react';
import Layout from '../../components/accounting/Layout';
import { useAccounting } from '../../utils/accountingStore';
import {
  formatCurrency,
  ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, getAccountTypeColor,
} from '../../utils/accountingHelpers';

const EMPTY_FORM = { code: '', name: '', type: 'asset', description: '' };

function AccountModal({ form, setForm, onSave, onClose, editing }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">{editing ? 'Edit Account' : 'New Account'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Code</label>
              <input type="text" placeholder="e.g. 1010" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Name *</label>
            <input type="text" placeholder="e.g. Checking Account" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input type="text" placeholder="Brief description" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={onSave} disabled={!form.name}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium">
              {editing ? 'Update' : 'Add Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { accounts, transactions, settings, loaded, addAccount, updateAccount, deleteAccount } = useAccounting();

  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [confirmDel, setConfirmDel] = useState(null);
  const [filterType, setFilterType] = useState('all');

  // Calculate account balances from transactions
  const balances = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const cat = t.category;
      if (!map[cat]) map[cat] = 0;
      map[cat] += t.type === 'income' ? (t.amount || 0) : -(t.amount || 0);
    });
    return map;
  }, [transactions]);

  const grouped = useMemo(() => {
    const types = filterType === 'all' ? ACCOUNT_TYPES : [filterType];
    return types.reduce((acc, type) => {
      const list = accounts
        .filter(a => a.type === type)
        .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      if (list.length) acc[type] = list;
      return acc;
    }, {});
  }, [accounts, filterType]);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (a) => {
    setEditId(a.id);
    setForm({ code: a.code || '', name: a.name, type: a.type, description: a.description || '' });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editId) updateAccount(editId, form);
    else addAccount(form);
    setShowModal(false);
  };

  const sym = settings.currencySymbol;

  if (!loaded) return <Layout title="Accounts"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout title="Chart of Accounts">
      {showModal && (
        <AccountModal form={form} setForm={setForm} onSave={handleSave} onClose={() => setShowModal(false)} editing={!!editId} />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDel(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <h3 className="font-semibold text-slate-800 mb-2">Delete account?</h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { deleteAccount(confirmDel); setConfirmDel(null); }} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 mb-5">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-sm">
          <button onClick={() => setFilterType('all')} className={`px-3 py-2 transition-colors ${filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>All</button>
          {ACCOUNT_TYPES.map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-2 capitalize transition-colors ${filterType === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {ACCOUNT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Account
        </button>
      </div>

      {/* Account groups */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([type, list]) => (
          <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getAccountTypeColor(type)}`}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </span>
                <span className="text-xs text-slate-400">{list.length} account{list.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 font-medium text-slate-500">Code</th>
                  <th className="text-left px-5 py-2.5 font-medium text-slate-500">Name</th>
                  <th className="text-left px-5 py-2.5 font-medium text-slate-500 hidden md:table-cell">Description</th>
                  <th className="text-right px-5 py-2.5 font-medium text-slate-500">Activity</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {list.map(acc => {
                  const balance = balances[acc.name] || 0;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-500 text-xs">{acc.code || '—'}</td>
                      <td className="px-5 py-3 font-medium text-slate-700">{acc.name}</td>
                      <td className="px-5 py-3 text-slate-400 hidden md:table-cell text-xs">{acc.description || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        {balance !== 0 ? (
                          <span className={`font-medium text-sm ${balance > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {balance > 0 ? '+' : ''}{formatCurrency(balance, sym)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(acc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setConfirmDel(acc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
            <p className="text-slate-400 text-sm">No accounts found.</p>
            <button onClick={openAdd} className="mt-3 text-indigo-600 text-sm hover:underline">Add your first account</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
