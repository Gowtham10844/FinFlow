import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Globe, Tag } from 'lucide-react';
import client from '../api/client';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const typeColors = {
  income:  'bg-green-100 text-green-700',
  expense: 'bg-red-100 text-red-600',
};

// React R1 fix: CatCard moved to module scope (not nested inside Categories).
// userId and onDelete are passed as explicit props so it doesn't close over
// stale parent-component state on every re-render.
function CatCard({ c, userId, onDelete }) {
  return (
    <div className="card flex items-center justify-between py-3.5 gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
          <Tag size={15} className="text-brand-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700 truncate">{c.name}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${typeColors[c.type]}`}>
            {c.type}
          </span>
        </div>
      </div>
      {c.user_id === null ? (
        <Globe size={14} className="text-slate-400 shrink-0" title="Global category" />
      ) : (
        c.user_id === userId && (
          <button
            onClick={() => onDelete(c.id)}
            className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )
      )}
    </div>
  );
}

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'expense' });

  // React R2 fix: load is now stable via useCallback and listed in the effect deps.
  // React R3 fix: uses AbortController to cancel stale requests.
  const load = useCallback(() => {
    const controller = new AbortController();
    client
      .get('/categories', { signal: controller.signal })
      .then((r) => setCategories(r.data))
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Failed to load categories:', err);
        }
      });
    return controller;
  }, []);

  useEffect(() => {
    const controller = load();
    return () => controller.abort();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await client.post('/categories', form);
    setShowModal(false);
    setForm({ name: '', type: 'expense' });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    await client.delete(`/categories/${id}`);
    load();
  };

  const globalCats = categories.filter((c) => c.user_id === null);
  const userCats   = categories.filter((c) => c.user_id !== null);

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-sub">Global categories plus your own custom ones</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add
        </button>
      </div>

      {/* Global */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
          <Globe size={12} /> Global Categories
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {globalCats.map((c) => (
            <CatCard key={c.id} c={c} userId={user?.id} onDelete={handleDelete} />
          ))}
        </div>
      </div>

      {/* User */}
      {userCats.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <Tag size={12} /> My Categories
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {userCats.map((c) => (
              <CatCard key={c.id} c={c} userId={user?.id} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title="Add Category" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input required placeholder="Category name" className="input" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {/* Type toggle — income or expense only */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Type</p>
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
            </div>
            <button type="submit" className="btn-primary mt-1">Add category</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
