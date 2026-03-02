import { useState, useMemo } from 'react';
import Link from 'next/link';
import Layout from '../../components/accounting/Layout';
import { useAccounting } from '../../utils/accountingStore';
import {
  formatCurrency, formatDate, todayISO, addDays,
  getInvoiceSummary, calcInvoiceTotals, getStatusBadgeClass,
} from '../../utils/accountingHelpers';

const genItemId = () => Math.random().toString(36).substr(2, 9);

function emptyInvoice(settings) {
  return {
    date: todayISO(),
    dueDate: addDays(todayISO(), 30),
    client: { name: '', email: '', address: '' },
    items: [{ id: genItemId(), description: '', quantity: 1, rate: 0, amount: 0 }],
    subtotal: 0,
    taxRate: settings?.taxRate ?? 10,
    tax: 0,
    total: 0,
    status: 'draft',
    notes: '',
    terms: 'Net 30',
  };
}

function InvoiceModal({ form, setForm, onSave, onClose, editing, settings }) {
  const updateItem = (id, field, val) => {
    const items = form.items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      updated.amount = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.rate) || 0);
      return updated;
    });
    const { subtotal, tax, total } = calcInvoiceTotals(items, form.taxRate);
    setForm(f => ({ ...f, items, subtotal, tax, total }));
  };

  const addItem = () => {
    const items = [...form.items, { id: genItemId(), description: '', quantity: 1, rate: 0, amount: 0 }];
    const { subtotal, tax, total } = calcInvoiceTotals(items, form.taxRate);
    setForm(f => ({ ...f, items, subtotal, tax, total }));
  };

  const removeItem = (id) => {
    if (form.items.length <= 1) return;
    const items = form.items.filter(item => item.id !== id);
    const { subtotal, tax, total } = calcInvoiceTotals(items, form.taxRate);
    setForm(f => ({ ...f, items, subtotal, tax, total }));
  };

  const updateTaxRate = (rate) => {
    const taxRate = parseFloat(rate) || 0;
    const { subtotal, tax, total } = calcInvoiceTotals(form.items, taxRate);
    setForm(f => ({ ...f, taxRate, subtotal, tax, total }));
  };

  const sym = settings?.currencySymbol || '$';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="font-semibold text-slate-800">{editing ? 'Edit Invoice' : 'New Invoice'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Dates + status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Client */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Client Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Client Name *</label>
                <input type="text" placeholder="Company or person" value={form.client.name}
                  onChange={e => setForm(f => ({ ...f, client: { ...f.client, name: e.target.value } }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" placeholder="billing@example.com" value={form.client.email}
                  onChange={e => setForm(f => ({ ...f, client: { ...f.client, email: e.target.value } }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Billing Address</label>
              <textarea rows={2} placeholder="Street, City, State, ZIP" value={form.client.address}
                onChange={e => setForm(f => ({ ...f, client: { ...f.client, address: e.target.value } }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
          </div>

          {/* Line items */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Line Items</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 font-medium text-slate-500">Description</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-500 w-20">Qty</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-500 w-24">Rate</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-500 w-24">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1.5">
                        <input type="text" placeholder="Item description" value={item.description}
                          onChange={e => updateItem(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" step="0.01" value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{sym}</span>
                          <input type="number" min="0" step="0.01" value={item.rate}
                            onChange={e => updateItem(item.id, 'rate', e.target.value)}
                            className="w-full pl-5 pr-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatCurrency(item.amount, sym)}
                      </td>
                      <td className="px-1 py-1.5">
                        <button onClick={() => removeItem(item.id)} disabled={form.items.length <= 1}
                          className="p-1 text-slate-300 hover:text-red-500 disabled:opacity-20 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 border-t border-slate-100">
                <button onClick={addItem} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add line item
                </button>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-60 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(form.subtotal, sym)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1">
                  Tax (
                  <input type="number" min="0" max="100" step="0.5" value={form.taxRate}
                    onChange={e => updateTaxRate(e.target.value)}
                    className="w-12 border-b border-slate-300 text-center focus:outline-none focus:border-indigo-400" />
                  %)
                </span>
                <span>{formatCurrency(form.tax, sym)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2">
                <span>Total</span>
                <span>{formatCurrency(form.total, sym)}</span>
              </div>
            </div>
          </div>

          {/* Notes + terms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea rows={2} placeholder="Thank you for your business!" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Payment Terms</label>
              <select value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option>Net 10</option>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 45</option>
                <option>Net 60</option>
                <option>Due on receipt</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={onSave} disabled={!form.client.name}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium">
              {editing ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Invoices() {
  const { invoices, settings, loaded, addInvoice, updateInvoice, deleteInvoice } = useAccounting();

  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(null);
  const [filterStatus, setFilter]   = useState('all');
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = useMemo(() => {
    let rows = [...invoices].sort((a, b) => b.date?.localeCompare(a.date));
    if (filterStatus !== 'all') rows = rows.filter(i => i.status === filterStatus);
    return rows;
  }, [invoices, filterStatus]);

  const summary = useMemo(() => getInvoiceSummary(invoices), [invoices]);
  const sym = settings.currencySymbol;

  const openNew = () => {
    setEditId(null);
    setForm(emptyInvoice(settings));
    setShowModal(true);
  };

  const openEdit = (inv) => {
    setEditId(inv.id);
    setForm({ ...inv, client: { ...inv.client }, items: inv.items.map(i => ({ ...i })) });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.client.name) return;
    if (editId) updateInvoice(editId, form);
    else addInvoice(form);
    setShowModal(false);
  };

  if (!loaded) return <Layout title="Invoices"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout title="Invoices">
      {showModal && form && (
        <InvoiceModal form={form} setForm={setForm} onSave={handleSave} onClose={() => setShowModal(false)} editing={!!editId} settings={settings} />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDel(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <h3 className="font-semibold text-slate-800 mb-2">Delete invoice?</h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { deleteInvoice(confirmDel); setConfirmDel(null); }} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Invoiced', amount: summary.total,   color: 'bg-slate-50   border-slate-200',  text: 'text-slate-700' },
          { label: 'Paid',           amount: summary.paid,    color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
          { label: 'Outstanding',    amount: summary.sent,    color: 'bg-blue-50    border-blue-100',    text: 'text-blue-700' },
          { label: 'Overdue',        amount: summary.overdue, color: 'bg-red-50     border-red-100',     text: 'text-red-600' },
        ].map(({ label, amount, color, text }) => (
          <div key={label} className={`border rounded-xl px-4 py-3 ${color}`}>
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className={`font-bold ${text}`}>{formatCurrency(amount, sym)}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 mb-4">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-sm flex-1 sm:flex-none">
          {['all', 'draft', 'sent', 'paid', 'overdue'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-2 capitalize transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={openNew} className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Invoice
        </button>
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p className="text-slate-400 text-sm">No invoices found.</p>
          <button onClick={openNew} className="mt-3 text-indigo-600 text-sm hover:underline">Create your first invoice</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Due</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/accounting/invoices/${inv.id}`} className="font-mono font-medium text-indigo-600 hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{inv.client.name}</p>
                      {inv.client.email && <p className="text-xs text-slate-400">{inv.client.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell whitespace-nowrap">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                      <span className={inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-slate-500'}>
                        {formatDate(inv.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {formatCurrency(inv.total, sym)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/accounting/invoices/${inv.id}`} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="View">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </Link>
                        <button onClick={() => openEdit(inv)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        {inv.status !== 'paid' && (
                          <button onClick={() => updateInvoice(inv.id, { status: 'paid' })} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Mark paid">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        )}
                        <button onClick={() => setConfirmDel(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
