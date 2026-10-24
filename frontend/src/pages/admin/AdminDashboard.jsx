import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, UserCheck, UserX, ArrowLeftRight, PiggyBank, Tags, UserPlus, 
  TrendingUp, Activity, ExternalLink, Calendar, ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import client from '../../api/client';
import StatCard from '../../components/StatCard.jsx';

const PIE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

const TooltipStyle = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    fontSize: 12,
    color: '#0f172a',
  },
  labelStyle: { color: '#475569', fontWeight: 700, marginBottom: 4 },
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function fetchDashboardData() {
      try {
        const res = await client.get('/admin/dashboard');
        if (mounted) {
          setData(res.data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.error || 'Failed to load admin dashboard');
          setLoading(false);
        }
      }
    }
    fetchDashboardData();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3 text-indigo-600">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold animate-pulse">Loading system statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-2xl p-6 text-center max-w-lg mx-auto my-12">
        <p className="font-bold text-lg mb-2">Error Loading Dashboard</p>
        <p className="text-sm text-orange-600">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-orange-600 text-white font-semibold rounded-xl text-xs hover:bg-orange-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    totalUsers,
    activeUsers,
    inactiveUsers,
    totalTransactions,
    totalBudgets,
    totalCategories,
    newUsersThisMonth,
    recentUsers,
    recentTransactions,
    monthlyTransactions,
    userGrowth,
    categoryUsage
  } = data;

  const barData = (monthlyTransactions || []).map(m => ({
    month: m.month,
    Income: Number(m.total_income),
    Expense: Number(m.total_expense)
  }));

  const lineData = (userGrowth || []).map(g => ({
    month: g.month,
    'New Users': Number(g.new_users)
  }));

  const pieData = (categoryUsage || []).map(c => ({
    name: c.category_name,
    value: Number(c.total_amount)
  }));

  return (
    <div className="flex flex-col gap-8 fade-in">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-500/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-3 border border-indigo-500/30">
            <Activity size={14} />
            System Insights
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Admin Overview</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">Real-time statistics across all users and financial activities</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30"
          >
            <Users size={16} />
            Manage Users
          </Link>
        </div>
      </div>

      {/* 7 Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totalUsers} accent="text-indigo-600" icon={Users} />
        <StatCard label="Active Users" value={activeUsers} accent="text-emerald-600" icon={UserCheck} />
        <StatCard label="Inactive Users" value={inactiveUsers} accent="text-amber-600" icon={UserX} />
        <StatCard label="New This Month" value={newUsersThisMonth} accent="text-blue-600" icon={UserPlus} />
        <StatCard label="Total Transactions" value={totalTransactions} accent="text-violet-600" icon={ArrowLeftRight} />
        <StatCard label="Total Budgets" value={totalBudgets} accent="text-teal-600" icon={PiggyBank} />
        <StatCard label="Total Categories" value={totalCategories} accent="text-rose-600" icon={Tags} />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Transactions Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Monthly Financial Activity</h2>
              <p className="text-xs text-slate-400">Total Income vs Expenses across platform</p>
            </div>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp size={18} />
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v)=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip {...TooltipStyle} formatter={(v)=>`₹${Number(v).toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: User Growth */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">User Growth Trend</h2>
              <p className="text-xs text-slate-400">New registered users per month</p>
            </div>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <UserPlus size={18} />
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...TooltipStyle} />
              <Line type="monotone" dataKey="New Users" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Category Usage */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Category Volume Distribution</h2>
              <p className="text-xs text-slate-400">Total spending across categories</p>
            </div>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Tags size={18} />
            </span>
          </div>
          {pieData.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={85} innerRadius={45} paddingAngle={4}>
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...TooltipStyle} formatter={(v)=>`₹${Number(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-2">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                      <span className="font-semibold text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">₹{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">No category transactions available</p>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent User Registrations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Recent User Registrations</h2>
              <p className="text-xs text-slate-400">Newly registered accounts</p>
            </div>
            <Link to="/admin/users" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentUsers.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-extrabold flex items-center justify-center text-xs uppercase">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <Link to={`/admin/users/${u.id}`} className="text-xs font-bold text-slate-800 hover:text-indigo-600 transition">
                      {u.name}
                    </Link>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    u.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}>
                    {u.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
            {!recentUsers.length && (
              <p className="text-xs text-slate-400 text-center py-6">No recent user registrations</p>
            )}
          </div>
        </div>

        {/* Recent Transactions Across All Users */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">System Activity</h2>
              <p className="text-xs text-slate-400">Latest transactions across all users</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t.category_name || 'Uncategorized'}</p>
                    <p className="text-[11px] text-slate-400">
                      by <Link to={`/admin/users/${t.user_id}`} className="font-semibold text-slate-600 hover:text-indigo-600">{t.user_name}</Link>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-extrabold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
            {!recentTransactions.length && (
              <p className="text-xs text-slate-400 text-center py-6">No recent transactions recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
