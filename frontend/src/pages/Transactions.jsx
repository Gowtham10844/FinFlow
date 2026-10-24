import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Pencil, Download, Upload, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import client from '../api/client';
import Modal from '../components/Modal.jsx';

const PAGE_SIZE = 25;

const emptyForm = {
  type: 'expense',
  amount: '',
  category_id: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
};

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef(null);
  const [showImportGuide, setShowImportGuide] = useState(false);

  const loadTxns = useCallback(async (signal) => {
    const params = { page, limit: PAGE_SIZE };
    if (filter !== 'all') params.type = filter;
    const { data } = await client.get('/transactions', { params, signal });
    setTxns(data.data);
    setTotal(data.total);
  }, [filter, page]);

  useEffect(() => {
    const controller = new AbortController();
    loadTxns(controller.signal).catch((err) => {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('Failed to load transactions:', err);
      }
    });
    return () => controller.abort();
  }, [loadTxns]);

  useEffect(() => {
    client.get('/categories').then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      type: t.type,
      amount: t.amount,
      category_id: t.category_id ?? '',
      description: t.description || '',
      date: t.date.slice(0, 10),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      category_id: form.category_id === '' ? null : Number(form.category_id),
    };
    if (editing) await client.put(`/transactions/${editing.id}`, payload);
    else await client.post('/transactions', payload);
    setShowModal(false);
    loadTxns();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    await client.delete(`/transactions/${id}`);
    loadTxns();
  };

  const handleExport = async () => {
    const res = await client.get('/csv/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'finflow_transactions.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await client.post('/csv/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    const dupMsg = data.duplicates > 0 ? `, ${data.duplicates} duplicate(s) skipped` : '';
    alert(`Imported ${data.inserted} transactions (${data.skipped} invalid${dupMsg})`);
    loadTxns();
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const csv = 'date,type,category,amount,description\n2026-08-14,expense,Food,250,Lunch at restaurant\n2026-08-14,income,Salary,50000,Monthly salary';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finflow_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filters = ['all', 'income', 'expense'];
  const filterColors = {
    all:     { active: 'bg-brand-600 text-white shadow-sm', inactive: 'bg-white text-slate-600 border border-brand-200 hover:bg-brand-50' },
    income:  { active: 'bg-green-600 text-white shadow-sm',  inactive: 'bg-white text-slate-600 border border-brand-200 hover:bg-green-50' },
    expense: { active: 'bg-red-500 text-white shadow-sm',    inactive: 'bg-white text-slate-600 border border-brand-200 hover:bg-red-50' },
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">Log and track your income &amp; expenses</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImportGuide(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Upload size={15} /> Import
          </button>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleImport} />
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> Export
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap items-center">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all duration-150 ${
              filter === f ? filterColors[f].active : filterColors[f].inactive
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">{total} records</span>
      </div>

      {/* Table card */}
      <div className="card p-0 overflow-hidden">
        {/* Table head */}
        <div className="grid grid-cols-[2fr_1fr_1fr_80px] bg-brand-50 border-b border-brand-100 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-brand-700">
          <span>Category / Description</span>
          <span>Date</span>
          <span className="text-right">Amount</span>
          <span></span>
        </div>

        <div className="divide-y divide-slate-100">
          {txns.map((t) => (
            <div key={t.id} className="grid grid-cols-[2fr_1fr_1fr_80px] items-center px-5 py-3.5 hover:bg-brand-50/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {t.type === 'income' ? '↑' : '↓'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{t.category_name || 'Uncategorized'}</p>
                  <p className="text-xs text-slate-400 truncate">{t.description || '—'}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">
                {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span className={`text-sm font-bold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
              </span>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-brand-600 p-1 rounded-lg hover:bg-brand-50 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {!txns.length && (
            <div className="flex flex-col items-center py-14 text-slate-400">
              <Search size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No transactions found</p>
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 flex-wrap gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 disabled:opacity-30 hover:text-brand-600 transition-colors"
            >
              <ChevronLeft size={15} /> Previous
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                    page === p
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-brand-50 hover:text-brand-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!canNext}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 disabled:opacity-30 hover:text-brand-600 transition-colors"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Transaction' : 'Add Transaction'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Type toggle */}
            <div className="flex gap-2">
              {['expense', 'income'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                    form.type === t
                      ? t === 'income' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input type="number" step="0.01" required placeholder="Amount (₹)" className="input"
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" required className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input type="text" placeholder="Description (optional)" className="input"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button type="submit" className="btn-primary mt-1">{editing ? 'Save changes' : 'Add transaction'}</button>
          </form>
        </Modal>
      )}
      {/* CSV Import Guide Modal */}
      {showImportGuide && (
        <Modal title="Import Transactions — CSV Format Guide" onClose={() => setShowImportGuide(false)}>
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-slate-600 text-xs leading-relaxed">
              Upload a <span className="font-bold text-brand-700">.csv</span> file with the following columns.
              Rows with missing or invalid data are skipped automatically.
            </p>

            {/* Column reference */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[100px_1fr] bg-brand-50 border-b border-brand-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                <span>Column</span><span>Notes</span>
              </div>
              {[
                ['date',        'YYYY-MM-DD  e.g. 2026-08-14'],
                ['type',        '"income" or "expense" (required)'],
                ['category',    'Category name (optional) — must match an existing name'],
                ['amount',      'Positive number, no currency symbol  e.g. 1500'],
                ['description', 'Free text (optional)'],
              ].map(([col, note]) => (
                <div key={col} className="grid grid-cols-[100px_1fr] px-3 py-2 border-b last:border-0 border-slate-100 items-start">
                  <code className="text-xs font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">{col}</code>
                  <span className="text-xs text-slate-500">{note}</span>
                </div>
              ))}
            </div>

            {/* Sample row */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sample rows</p>
              <pre className="bg-slate-900 text-green-400 text-[11px] p-3 rounded-xl overflow-x-auto leading-relaxed">
{`date,type,category,amount,description
2026-08-14,expense,Food,250,Lunch at restaurant
2026-08-14,income,Salary,50000,Monthly salary`}
              </pre>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={downloadTemplate}
                className="btn-secondary flex-1 text-xs py-2"
              >
                ↓ Download Template
              </button>
              <button
                type="button"
                onClick={() => { setShowImportGuide(false); fileRef.current.click(); }}
                className="btn-primary flex-1 text-xs py-2"
              >
                Choose CSV File →
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
