import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAccounting } from '../../../utils/accountingStore';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../../utils/accountingHelpers';

export async function getStaticPaths() {
  return { paths: [], fallback: true };
}

export async function getStaticProps({ params }) {
  return { props: { id: params.id } };
}

export default function InvoiceDetail({ id }) {
  const router = useRouter();
  const { invoices, settings, loaded, updateInvoice } = useAccounting();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    if (loaded && id) {
      const inv = invoices.find(i => i.id === id);
      if (inv) setInvoice(inv);
    }
  }, [loaded, id, invoices]);

  if (router.isFallback || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Invoice not found.</p>
          <Link href="/accounting/invoices" className="text-indigo-600 hover:underline text-sm">← Back to invoices</Link>
        </div>
      </div>
    );
  }

  const sym = settings.currencySymbol;

  return (
    <>
      <Head>
        <title>{invoice.number} — {invoice.client.name}</title>
      </Head>

      {/* Print actions bar (hidden when printing) */}
      <div className="print:hidden bg-slate-800 text-white px-6 py-3 flex items-center gap-3">
        <Link href="/accounting/invoices" className="text-slate-300 hover:text-white text-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Invoices
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-sm font-mono">{invoice.number}</span>
        <div className="ml-auto flex items-center gap-2">
          {invoice.status !== 'paid' && (
            <button
              onClick={() => { updateInvoice(invoice.id, { status: 'paid' }); router.push('/accounting/invoices'); }}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Mark as Paid
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="min-h-screen bg-slate-100 print:bg-white p-6 print:p-0">
        <div className="max-w-3xl mx-auto bg-white shadow-lg print:shadow-none rounded-2xl print:rounded-none overflow-hidden">
          {/* Header */}
          <div className="bg-slate-800 print:bg-slate-800 text-white px-10 py-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{settings.companyName}</h1>
              <div className="mt-2 text-slate-400 text-sm space-y-0.5">
                {settings.companyAddress.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                {settings.companyEmail && <p>{settings.companyEmail}</p>}
                {settings.companyPhone && <p>{settings.companyPhone}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-400">INVOICE</p>
              <p className="text-slate-400 font-mono text-lg mt-1">{invoice.number}</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-2 capitalize ${getStatusBadgeClass(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-3 border-b border-slate-100 divide-x divide-slate-100">
            <div className="px-8 py-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Bill To</p>
              <p className="font-semibold text-slate-800">{invoice.client.name}</p>
              {invoice.client.address.split('\n').map((l, i) => <p key={i} className="text-sm text-slate-500">{l}</p>)}
              {invoice.client.email && <p className="text-sm text-slate-500">{invoice.client.email}</p>}
            </div>
            <div className="px-8 py-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Invoice Date</p>
              <p className="font-semibold text-slate-800">{formatDate(invoice.date)}</p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-3 mb-1">Payment Terms</p>
              <p className="text-sm text-slate-700">{invoice.terms}</p>
            </div>
            <div className="px-8 py-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Due Date</p>
              <p className={`font-semibold ${invoice.status === 'overdue' ? 'text-red-600' : 'text-slate-800'}`}>
                {formatDate(invoice.dueDate)}
              </p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-3 mb-1">Amount Due</p>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(invoice.total, sym)}</p>
            </div>
          </div>

          {/* Line items */}
          <div className="px-10 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-800">
                  <th className="text-left py-2 font-semibold text-slate-700">Description</th>
                  <th className="text-right py-2 font-semibold text-slate-700 w-20">Qty</th>
                  <th className="text-right py-2 font-semibold text-slate-700 w-28">Rate</th>
                  <th className="text-right py-2 font-semibold text-slate-700 w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-3 text-slate-700">{item.description}</td>
                    <td className="py-3 text-right text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-600">{formatCurrency(item.rate, sym)}</td>
                    <td className="py-3 text-right font-medium text-slate-800">{formatCurrency(item.amount, sym)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-56 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, sym)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span>{formatCurrency(invoice.tax, sym)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-800 border-t-2 border-slate-800 pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total, sym)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          {(invoice.notes || invoice.terms) && (
            <div className="px-10 pb-8 border-t border-slate-100 pt-5 grid grid-cols-2 gap-6 text-sm">
              {invoice.notes && (
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Notes</p>
                  <p className="text-slate-500">{invoice.notes}</p>
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-700 mb-1">Payment Terms</p>
                <p className="text-slate-500">{invoice.terms}</p>
              </div>
            </div>
          )}

          <div className="bg-indigo-600 px-10 py-4 text-center">
            <p className="text-indigo-200 text-sm">Thank you for your business! Questions? {settings.companyEmail}</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
