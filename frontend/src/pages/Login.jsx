import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Mail, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login({ appMode = 'user' }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(form.email, form.password);
      if (loggedUser?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch bg-slate-50">
      {/* Left decorative panel */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-xs text-center z-10">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-5 inline-flex mb-8 shadow-2xl">
            <Wallet size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">
            Manage Money<br />with Clarity
          </h1>
          <p className="text-brand-100 text-sm leading-relaxed">
            Track income and expenses, set monthly budgets, and visualise your financial health — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3 text-center">
            {[['Transactions', 'Track every rupee'], ['Budgets', 'Set limits'], ['Reports', 'Analyse trends']].map(([t, d]) => (
              <div key={t} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="font-bold text-xs">{t}</p>
                <p className="text-[10px] text-brand-100 mt-0.5">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="bg-brand-600 rounded-xl p-1.5">
              <Wallet className="text-white" size={22} />
            </div>
            <span className="text-xl font-extrabold text-brand-900">FinFlow</span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Welcome Back</h2>
          <p className="text-slate-500 text-xs mb-7">Sign in to your FinFlow account</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  className="input pl-9"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  className="input pl-9"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium rounded-xl px-3.5 py-3">
                {error}
                {error.includes('Admin Portal') && (
                  <div className="mt-2">
                    <a
                      href="http://localhost:5174"
                      className="font-bold text-indigo-600 hover:underline"
                    >
                      → Go to Admin Portal (port 5174)
                    </a>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-1 py-2.5 text-sm font-bold"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-6">
            No account?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:underline">Register</Link>
          </p>

          {/* Link to admin portal */}
          <div className="mt-4 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck size={14} className="text-indigo-600" />
              Admin? Use the Admin Console
            </div>
            <Link
              to="/admin/login"
              className="font-bold text-indigo-600 hover:text-indigo-700 transition text-[11px]"
            >
              Admin Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
