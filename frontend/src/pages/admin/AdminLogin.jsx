import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in as admin, go to admin dashboard
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(form.email, form.password);
      if (loggedUser?.role !== 'admin') {
        setError('Access denied. This console is for administrators only. Please use the User Sign In.');
        localStorage.removeItem('finflow_token');
        localStorage.removeItem('finflow_user');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Check credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch bg-slate-900">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-5/12 flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden border-r border-indigo-900/30">
        {/* Background dot grid */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#a5b4fc_1px,transparent_1px)] [background-size:20px_20px]"></div>
        
        {/* Glowing orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl"></div>

        <div className="relative z-10 text-center max-w-xs">
          <div className="bg-indigo-600/20 border border-indigo-500/40 backdrop-blur-md rounded-3xl p-6 inline-flex mb-8 shadow-2xl shadow-indigo-500/20">
            <ShieldCheck size={52} className="text-indigo-300" />
          </div>
          <h1 className="text-3xl font-black text-white leading-tight mb-3">
            FinFlow<br />
            <span className="text-indigo-400">Admin Console</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Secure, restricted access portal for system administrators. Monitor users, review transactions, and maintain platform integrity.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-3">
            {[
              ['User Management', 'Activate, deactivate & audit all accounts'],
              ['Financial Analytics', 'System-wide income, expense & category charts'],
              ['Audit Trail', 'Immutable logs of all admin & user actions'],
            ].map(([title, desc]) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                <p className="text-indigo-300 text-xs font-bold">{title}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center bg-slate-900 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="bg-indigo-600 rounded-xl p-2 shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="text-white" size={22} />
            </div>
            <div>
              <span className="text-lg font-extrabold text-white tracking-tight">FinFlow</span>
              <span className="ml-2 text-[10px] uppercase font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">Admin</span>
            </div>
          </div>

          {/* Restricted access badge */}
          <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <AlertCircle size={15} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 font-semibold">Restricted Access — Administrators Only</p>
          </div>

          <h2 className="text-2xl font-extrabold text-white mb-1">Admin Sign In</h2>
          <p className="text-slate-400 text-xs mb-7">Enter your administrator credentials to proceed</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@finflow.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
            </div>

            {error && (
              <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Authenticating...
                </span>
              ) : 'Sign in to Admin Console'}
            </button>
          </form>


          <p className="text-xs text-slate-600 text-center mt-6">
            Regular user?{' '}
            <Link
              to="/login"
              className="text-indigo-400 font-semibold hover:text-indigo-300 transition"
            >
              Go to User Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
