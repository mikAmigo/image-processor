import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const genId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export const DEFAULT_ACCOUNTS = [
  { id: 'acc1',  code: '1010', name: 'Checking Account',     type: 'asset',     description: 'Primary business checking account' },
  { id: 'acc2',  code: '1020', name: 'Savings Account',      type: 'asset',     description: 'Business savings account' },
  { id: 'acc3',  code: '1100', name: 'Accounts Receivable',  type: 'asset',     description: 'Money owed by customers' },
  { id: 'acc4',  code: '1200', name: 'Inventory',            type: 'asset',     description: 'Goods held for sale' },
  { id: 'acc5',  code: '2000', name: 'Accounts Payable',     type: 'liability', description: 'Money owed to suppliers' },
  { id: 'acc6',  code: '2100', name: 'Credit Card Payable',  type: 'liability', description: 'Credit card balances' },
  { id: 'acc7',  code: '2200', name: 'Tax Payable',          type: 'liability', description: 'Sales and income taxes owed' },
  { id: 'acc8',  code: '3000', name: 'Owner Equity',         type: 'equity',    description: "Owner's investment in the business" },
  { id: 'acc9',  code: '3100', name: 'Retained Earnings',    type: 'equity',    description: 'Accumulated profits' },
  { id: 'acc10', code: '4000', name: 'Sales Revenue',        type: 'income',    description: 'Revenue from product sales' },
  { id: 'acc11', code: '4100', name: 'Service Revenue',      type: 'income',    description: 'Revenue from services rendered' },
  { id: 'acc12', code: '4200', name: 'Interest Income',      type: 'income',    description: 'Interest earned on accounts' },
  { id: 'acc13', code: '5000', name: 'Cost of Goods Sold',   type: 'expense',   description: 'Direct cost of products sold' },
  { id: 'acc14', code: '6000', name: 'Rent Expense',         type: 'expense',   description: 'Office and facility rent' },
  { id: 'acc15', code: '6100', name: 'Utilities',            type: 'expense',   description: 'Electricity, water, internet' },
  { id: 'acc16', code: '6200', name: 'Payroll',              type: 'expense',   description: 'Employee salaries and wages' },
  { id: 'acc17', code: '6300', name: 'Marketing',            type: 'expense',   description: 'Advertising and promotions' },
  { id: 'acc18', code: '6400', name: 'Office Supplies',      type: 'expense',   description: 'Stationery, software, equipment' },
  { id: 'acc19', code: '6500', name: 'Travel',               type: 'expense',   description: 'Business travel expenses' },
  { id: 'acc20', code: '6600', name: 'Professional Services', type: 'expense',  description: 'Legal, accounting, consulting' },
];

const DEFAULT_SETTINGS = {
  companyName: 'My Business',
  companyEmail: 'hello@mybusiness.com',
  companyAddress: '123 Business Street, City, State 10001',
  companyPhone: '+1 (555) 000-0000',
  currency: 'USD',
  currencySymbol: '$',
  taxRate: 10,
  invoicePrefix: 'INV',
  nextInvoiceNumber: 4,
};

const makeSampleTransactions = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = (n) => String(now.getMonth() + 1 - n < 1 ? now.getMonth() + 1 - n + 12 : now.getMonth() + 1 - n).padStart(2, '0');
  const yr = (n) => now.getMonth() + 1 - n < 1 ? y - 1 : y;
  return [
    { id: genId(), date: `${y}-${m(0)}-01`, description: 'Client payment — Project Alpha',     amount: 5000, type: 'income',  category: 'Service Revenue', reference: 'PMT-001', notes: '' },
    { id: genId(), date: `${y}-${m(0)}-03`, description: 'Office rent — March',                amount: 1200, type: 'expense', category: 'Rent Expense',    reference: 'EXP-001', notes: '' },
    { id: genId(), date: `${y}-${m(0)}-05`, description: 'Software subscriptions',             amount: 149,  type: 'expense', category: 'Office Supplies', reference: 'EXP-002', notes: '' },
    { id: genId(), date: `${y}-${m(0)}-08`, description: 'Client payment — Project Beta',      amount: 3500, type: 'income',  category: 'Service Revenue', reference: 'PMT-002', notes: '' },
    { id: genId(), date: `${y}-${m(0)}-10`, description: 'Electricity bill',                   amount: 218,  type: 'expense', category: 'Utilities',       reference: 'EXP-003', notes: '' },
    { id: genId(), date: `${y}-${m(0)}-12`, description: 'Payroll — Staff March',              amount: 4500, type: 'expense', category: 'Payroll',         reference: 'EXP-004', notes: '' },
    { id: genId(), date: `${y}-${m(0)}-15`, description: 'Google Ads campaign',                amount: 800,  type: 'expense', category: 'Marketing',       reference: 'EXP-005', notes: '' },
    { id: genId(), date: `${y}-${m(0)}-18`, description: 'Product sales — online store',       amount: 2200, type: 'income',  category: 'Sales Revenue',   reference: 'PMT-003', notes: '' },
    { id: genId(), date: `${yr(1)}-${m(1)}-05`, description: 'Consulting retainer — Feb',      amount: 4200, type: 'income',  category: 'Service Revenue', reference: 'PMT-004', notes: '' },
    { id: genId(), date: `${yr(1)}-${m(1)}-10`, description: 'Office supplies purchase',       amount: 176,  type: 'expense', category: 'Office Supplies', reference: 'EXP-006', notes: '' },
    { id: genId(), date: `${yr(1)}-${m(1)}-15`, description: 'Office rent — Feb',              amount: 1200, type: 'expense', category: 'Rent Expense',    reference: 'EXP-007', notes: '' },
    { id: genId(), date: `${yr(1)}-${m(1)}-20`, description: 'Client payment — Retainer',      amount: 2000, type: 'income',  category: 'Service Revenue', reference: 'PMT-005', notes: '' },
    { id: genId(), date: `${yr(1)}-${m(1)}-22`, description: 'Payroll — Staff Feb',            amount: 4500, type: 'expense', category: 'Payroll',         reference: 'EXP-008', notes: '' },
    { id: genId(), date: `${yr(2)}-${m(2)}-08`, description: 'New client onboarding',          amount: 3800, type: 'income',  category: 'Service Revenue', reference: 'PMT-006', notes: '' },
    { id: genId(), date: `${yr(2)}-${m(2)}-12`, description: 'Office rent — Jan',              amount: 1200, type: 'expense', category: 'Rent Expense',    reference: 'EXP-009', notes: '' },
    { id: genId(), date: `${yr(2)}-${m(2)}-18`, description: 'Payroll — Staff Jan',            amount: 4500, type: 'expense', category: 'Payroll',         reference: 'EXP-010', notes: '' },
    { id: genId(), date: `${yr(2)}-${m(2)}-25`, description: 'Year-end product sales',         amount: 3100, type: 'income',  category: 'Sales Revenue',   reference: 'PMT-007', notes: '' },
    { id: genId(), date: `${yr(3)}-${m(3)}-05`, description: 'Consulting fees',                amount: 5500, type: 'income',  category: 'Service Revenue', reference: 'PMT-008', notes: '' },
    { id: genId(), date: `${yr(3)}-${m(3)}-15`, description: 'Office rent',                    amount: 1200, type: 'expense', category: 'Rent Expense',    reference: 'EXP-011', notes: '' },
    { id: genId(), date: `${yr(3)}-${m(3)}-20`, description: 'Payroll',                        amount: 4500, type: 'expense', category: 'Payroll',         reference: 'EXP-012', notes: '' },
    { id: genId(), date: `${yr(4)}-${m(4)}-10`, description: 'Product launch revenue',         amount: 6200, type: 'income',  category: 'Sales Revenue',   reference: 'PMT-009', notes: '' },
    { id: genId(), date: `${yr(4)}-${m(4)}-15`, description: 'Office rent',                    amount: 1200, type: 'expense', category: 'Rent Expense',    reference: 'EXP-013', notes: '' },
    { id: genId(), date: `${yr(4)}-${m(4)}-20`, description: 'Payroll',                        amount: 4500, type: 'expense', category: 'Payroll',         reference: 'EXP-014', notes: '' },
    { id: genId(), date: `${yr(5)}-${m(5)}-12`, description: 'Annual contract payment',        amount: 7500, type: 'income',  category: 'Service Revenue', reference: 'PMT-010', notes: '' },
    { id: genId(), date: `${yr(5)}-${m(5)}-15`, description: 'Office rent',                    amount: 1200, type: 'expense', category: 'Rent Expense',    reference: 'EXP-015', notes: '' },
    { id: genId(), date: `${yr(5)}-${m(5)}-20`, description: 'Payroll',                        amount: 4500, type: 'expense', category: 'Payroll',         reference: 'EXP-016', notes: '' },
  ];
};

const makeSampleInvoices = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const m2 = String(now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return [
    {
      id: genId(),
      number: 'INV-001',
      date: `${y}-${m}-01`,
      dueDate: `${y}-${m}-${lastDay}`,
      client: { name: 'Acme Corporation', email: 'billing@acme.com', address: '123 Business Ave\nNew York, NY 10001' },
      items: [
        { id: genId(), description: 'Web Development Services', quantity: 40, rate: 100, amount: 4000 },
        { id: genId(), description: 'UI/UX Design',             quantity: 15, rate:  80, amount: 1200 },
      ],
      subtotal: 5200, taxRate: 10, tax: 520, total: 5720,
      status: 'paid', notes: 'Thank you for your business!', terms: 'Net 30',
    },
    {
      id: genId(),
      number: 'INV-002',
      date: `${y}-${m}-08`,
      dueDate: `${y}-${m2}-07`,
      client: { name: 'TechStart Inc', email: 'accounts@techstart.io', address: '456 Startup Blvd\nSan Francisco, CA 94105' },
      items: [
        { id: genId(), description: 'Consulting Services — Q1', quantity: 20, rate: 150, amount: 3000 },
        { id: genId(), description: 'Technical Documentation',  quantity:  5, rate: 100, amount:  500 },
      ],
      subtotal: 3500, taxRate: 10, tax: 350, total: 3850,
      status: 'sent', notes: '', terms: 'Net 30',
    },
    {
      id: genId(),
      number: 'INV-003',
      date: `${y}-${m}-15`,
      dueDate: `${y}-${m}-25`,
      client: { name: 'Global Media Group', email: 'finance@globalmedia.com', address: '789 Media Lane\nChicago, IL 60601' },
      items: [
        { id: genId(), description: 'Social Media Management', quantity:  1, rate: 1500, amount: 1500 },
        { id: genId(), description: 'Content Creation',        quantity: 10, rate:  100, amount: 1000 },
      ],
      subtotal: 2500, taxRate: 10, tax: 250, total: 2750,
      status: 'overdue', notes: 'Payment is overdue. Please remit immediately.', terms: 'Net 10',
    },
  ];
};

const AccountingContext = createContext(null);

export function AccountingProvider({ children }) {
  const [accounts, setAccounts]         = useState(DEFAULT_ACCOUNTS);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices]         = useState([]);
  const [settings, setSettingsState]    = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded]             = useState(false);

  useEffect(() => {
    try {
      const a = localStorage.getItem('acc_accounts');
      const t = localStorage.getItem('acc_transactions');
      const i = localStorage.getItem('acc_invoices');
      const s = localStorage.getItem('acc_settings');
      if (a) setAccounts(JSON.parse(a));
      setTransactions(t ? JSON.parse(t) : makeSampleTransactions());
      setInvoices(i ? JSON.parse(i) : makeSampleInvoices());
      if (s) setSettingsState(JSON.parse(s));
    } catch {
      setTransactions(makeSampleTransactions());
      setInvoices(makeSampleInvoices());
    }
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem('acc_accounts',     JSON.stringify(accounts)); },     [accounts,     loaded]);
  useEffect(() => { if (loaded) localStorage.setItem('acc_transactions', JSON.stringify(transactions)); }, [transactions, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem('acc_invoices',     JSON.stringify(invoices)); },     [invoices,     loaded]);
  useEffect(() => { if (loaded) localStorage.setItem('acc_settings',     JSON.stringify(settings)); },     [settings,     loaded]);

  const addTransaction    = useCallback((t)       => setTransactions(p => [...p, { ...t, id: genId() }]), []);
  const updateTransaction = useCallback((id, upd) => setTransactions(p => p.map(t => t.id === id ? { ...t, ...upd } : t)), []);
  const deleteTransaction = useCallback((id)      => setTransactions(p => p.filter(t => t.id !== id)), []);

  const addInvoice = useCallback((inv) => {
    const num = settings.nextInvoiceNumber;
    const number = `${settings.invoicePrefix}-${String(num).padStart(3, '0')}`;
    const newInv = { ...inv, id: genId(), number };
    setInvoices(p => [...p, newInv]);
    setSettingsState(p => ({ ...p, nextInvoiceNumber: num + 1 }));
    return newInv;
  }, [settings.nextInvoiceNumber, settings.invoicePrefix]);

  const updateInvoice = useCallback((id, upd) => setInvoices(p => p.map(inv => inv.id === id ? { ...inv, ...upd } : inv)), []);
  const deleteInvoice = useCallback((id)      => setInvoices(p => p.filter(inv => inv.id !== id)), []);

  const addAccount    = useCallback((a)       => setAccounts(p => [...p, { ...a, id: genId() }]), []);
  const updateAccount = useCallback((id, upd) => setAccounts(p => p.map(a => a.id === id ? { ...a, ...upd } : a)), []);
  const deleteAccount = useCallback((id)      => setAccounts(p => p.filter(a => a.id !== id)), []);

  const setSettings = useCallback((upd) => setSettingsState(p => ({ ...p, ...upd })), []);

  return (
    <AccountingContext.Provider value={{
      accounts, transactions, invoices, settings, loaded,
      addTransaction, updateTransaction, deleteTransaction,
      addInvoice, updateInvoice, deleteInvoice,
      addAccount, updateAccount, deleteAccount,
      setSettings,
    }}>
      {children}
    </AccountingContext.Provider>
  );
}

export function useAccounting() {
  const ctx = useContext(AccountingContext);
  if (!ctx) throw new Error('useAccounting must be used within AccountingProvider');
  return ctx;
}
