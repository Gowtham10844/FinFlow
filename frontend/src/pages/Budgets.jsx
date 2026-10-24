import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import client from '../api/client';
import Modal from '../components/Modal.jsx';

const now = new Date();

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [deletedBudgets, setDeletedBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [restorePrompt, setRestorePrompt] = useState(null);
  const [form, setForm] = useState({ category_id: '', limit_amount: '' });
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadDeletedBudgets = useCallback(() => {
    client
      .get('/budgets/deleted')
      .then((r) => setDeletedBudgets(r.data))
      .catch((err) => console.error('Failed to load deleted budgets:', err));
  }, []);

  const load = useCallback(() => {
    const controller = new AbortController();
    client
      .get('/budgets', { params: { month, year }, signal: controller.signal })
      .then((r) => setBudgets(r.data))
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Failed to load budgets:', err);
        }
      });
    loadDeletedBudgets();
    return controller;
  }, [month, year, loadDeletedBudgets]);

  useEffect(() => {
    const controller = load();
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    client.get('/categories').then((r) => setCategories(r.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await client.post('/budgets', { ...form, month, year });
      setShowModal(false);
      setForm({ category_id: '', limit_amount: '' });
      load();
      showToast('Budget created successfully!');
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.restoreAvailable) {
        setRestorePrompt({ budgetId: err.response.data.budgetId });
      } else {
        const errMsg = err.response?.data?.error || 'Failed to set budget';
        setFormError(errMsg);
        showToast(errMsg, 'error');
      }
    }
  };

  const handleRestore = async (id) => {
    try {
      await client.patch(`/budgets/${id}/restore`);
      setShowDeletedModal(false);
      setRestorePrompt(null);
      load();
      showToast('Budget restored successfully!');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to restore budget';
      showToast(msg, 'error');
    }
  };

  const handleConfirmRestore = async (id) => {
    await handleRestore(id);
    setShowModal(false);
    setForm({ category_id: '', limit_amount: '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await client.delete(`/budgets/${id}`);
      load();
      showToast('Budget deleted.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete budget', 'error');
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm('Permanently delete this budget? This action cannot be undone.')) return;
    try {
      await client.delete(`/budgets/${id}/permanent`);
      load();
      showToast('Budget permanently deleted.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to permanently delete budget', 'error');
    }
  };

  const alertConfig = {
    exceeded: {
      barColor: 'bg-red-500',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <XCircle size={14} className="text-red-500 shrink-0" />,
      text: 'text-red-600',
      label: 'Budget exceeded',
    },
    warning: {
      barColor: 'bg-amber-400',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: <AlertTriangle size={14} className="text-amber-500 shrink-0" />,
      text: 'text-amber-700',
      label: '80% of budget used',
    },
    ok: {
      barColor: 'bg-brand-500',
      bg: 'bg-brand-50',
      border: 'border-brand-100',
      icon: <CheckCircle2 size={14} className="text-brand-500 shrink-0" />,
      text: 'text-brand-700',
      label: 'On track',
    },
  };

  return (
    <div className="flex flex-col gap-6 fade-in relative">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-sub">Monthly spending limits by category</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeletedModal(true)}
            className="px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2"
          >
            <Trash2 size={15} className="text-slate-400" />
            <span>Deleted</span>
            <span className="ml-0.5 px-1.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full">
              {deletedBudgets.length}
            </span>
          </button>
          <button onClick={() => { setFormError(''); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Set Budget
          </button>
        </div>
      </div>

      {/* Month / year selectors */}
      <div className="flex gap-2">
        <select className="input max-w-[160px]" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
            </option>
          ))}
        </select>
        <select className="input max-w-[100px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Budget cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map((b) => {
          const pct   = Math.min(Number(b.pct_used), 100);
          const level = b.alert_level || 'ok';
          const cfg   = alertConfig[level] || alertConfig.ok;
          return (
            <div key={b.id} className={`card border ${cfg.border}`}>
              {/* Title row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {cfg.icon}
                  <p className="font-bold text-slate-700">{b.category_name}</p>
                </div>
                <button onClick={() => handleDelete(b.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full ${cfg.barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Amounts */}
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Spent: <span className="font-semibold text-slate-700">₹{Number(b.spent).toLocaleString()}</span></span>
                <span>Limit: <span className="font-semibold text-slate-700">₹{Number(b.limit_amount).toLocaleString()}</span></span>
              </div>

              {/* Alert label */}
              <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                {pct.toFixed(0)}% used · {cfg.label}
              </div>
            </div>
          );
        })}
        {!budgets.length && (
          <div className="col-span-2 text-center py-14 text-slate-400">
            <p className="text-sm">No budgets set for this month</p>
          </div>
        )}
      </div>

      {/* Set Budget Modal */}
      {showModal && (
        <Modal title="Set Monthly Budget" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {formError && (
              <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 flex items-center gap-2">
                <XCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <select required className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category</option>
              {categories.filter((c) => c.type !== 'income').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" step="0.01" required placeholder="Limit amount (₹)" className="input"
              value={form.limit_amount} onChange={(e) => setForm({ ...form, limit_amount: e.target.value })} />
            <button type="submit" className="btn-primary mt-1">Set budget</button>
          </form>
        </Modal>
      )}

      {/* Deleted Budgets Modal */}
      {showDeletedModal && (
        <Modal title="Deleted Budgets" onClose={() => setShowDeletedModal(false)}>
          {deletedBudgets.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <p>No deleted budgets found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {deletedBudgets.map((b) => (
                <div key={b.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{b.category_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Limit: <span className="font-semibold text-slate-700">₹{Number(b.limit_amount).toLocaleString()}</span> · {new Date(2000, b.month - 1, 1).toLocaleString('en-US', { month: 'short' })} {b.year}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Deleted on {b.deleted_at ? new Date(b.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(b.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} /> Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(b.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Forever"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Restore Confirmation Dialog */}
      {restorePrompt && (
        <Modal title="Restore Deleted Budget?" onClose={() => setRestorePrompt(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
              <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold">A deleted budget already exists</p>
                <p className="text-xs text-amber-800 mt-1">
                  A soft-deleted budget exists for this category and month. Would you like to restore it?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestorePrompt(null)}
                className="px-3.5 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRestore(restorePrompt.budgetId)}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> Restore Budget
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-2.5 transition-all ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle size={18} className="text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
