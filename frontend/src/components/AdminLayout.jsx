import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldAlert, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const adminNavItems = [
  { to: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
  { to: '/admin/users',     label: 'User Management', icon: Users },
  { to: '/admin/audit-logs', label: 'Audit History',  icon: ShieldAlert },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900/5 text-slate-800">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 text-slate-100 border-r border-slate-800 shadow-xl px-4 py-7">
        {/* Admin Brand Logo */}
        <div className="flex items-center gap-2.5 px-3 mb-8">
          <div className="bg-indigo-600 rounded-xl p-2 shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="text-white" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold text-white tracking-tight">FinFlow</span>
              <span className="text-[10px] uppercase font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Control Panel</p>
          </div>
        </div>

        {/* Admin Navigation */}
        <nav className="flex-1 flex flex-col gap-1.5">
          <div className="px-3 mb-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Administration</p>
          </div>
          {adminNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* Link to User Portal */}
          <div className="pt-6 px-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">User Portal</p>
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 bg-slate-800/60 border border-slate-700/60 hover:text-white hover:border-slate-600 transition-all"
            >
              <LayoutDashboard size={15} />
              Open User Portal
            </Link>
          </div>
        </nav>

        {/* Admin User Info & Logout */}
        <div className="border-t border-slate-800 pt-4 mt-4">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-sm uppercase">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
              <span className="inline-block text-[10px] text-indigo-400 font-medium truncate">
                {user?.email}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 w-full transition-all duration-150"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="md:hidden bg-indigo-600 rounded-lg p-1.5">
              <ShieldCheck className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">FinFlow Administration</h1>
              <p className="text-xs text-slate-500 hidden sm:block">System metrics, user management &amp; audit logs</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Admin Mode Active
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full fade-in">
          <Outlet />
        </main>
      </div>

      {/* ── Bottom Nav (Mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around py-2.5 z-20 shadow-2xl">
        {adminNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-bold transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-400'
              }`
            }
          >
            <Icon size={20} />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
