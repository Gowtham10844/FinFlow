import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Tags, BarChart3, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets',      label: 'Budgets',      icon: PiggyBank },
  { to: '/categories',   label: 'Categories',   icon: Tags },
  { to: '/reports',      label: 'Reports',      icon: BarChart3 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-brand-100 shadow-sm px-4 py-7">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 mb-9">
          <div className="bg-brand-600 rounded-xl p-1.5">
            <Wallet className="text-white" size={20} />
          </div>
          <span className="text-lg font-bold text-brand-900 tracking-tight">FinFlow</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive ? 'nav-active' : 'nav-inactive'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User & logout */}
        <div className="border-t border-brand-100 pt-4 mt-4">
          <div className="flex items-center gap-2.5 px-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs uppercase">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 w-full transition-all duration-150"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 p-5 md:p-8 pb-24 md:pb-8 max-w-6xl mx-auto w-full fade-in">
        <Outlet />
      </main>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-100 flex justify-around py-2 z-10 shadow-[0_-2px_12px_0_rgba(37,99,235,0.07)]">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-slate-400'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
