import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Calendar, Shield, UserCheck, UserX, RotateCcw, 
  ArrowLeftRight, PiggyBank, Tags, BarChart3, Clock, Wallet, TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import client from '../../api/client';
import StatCard from '../../components/StatCard.jsx';

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

export default function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [txns, setTxns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUserData = async () => {
    setLoading(true);
    setError('');
    try {
      const [uRes, tRes, cRes, bRes, rRes, aRes] = await Promise.all([
        client.get(`/admin/users/${id}`),
        client.get(`/admin/users/${id}/transactions`),
        client.get(`/admin/users/${id}/categories`),
        client.get(`/admin/users/${id}/budgets`),
        client.get(`/admin/users/${id}/reports`),
        client.get(`/admin/users/${id}/audit-logs`)
      ]);

      setUser(uRes.data);
      setTxns(tRes.data);
      setCategories(cRes.data);
      setBudgets(bRes.data);
      setReports(rRes.data);
      setAuditLogs(aRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!user) return;
    const targetStatus = user.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to set user status to ${targetStatus}?`)) return;

    setActionLoading(true);
    try {
      if (targetStatus === 'active' && user.deleted_at) {
        await client.post(`/admin/users/${id}/restore`);
      } else {
        await client.put(`/admin/users/${id}/status`, { status: targetStatus });
      }
      await fetchUserData();
    } catch (err) {
      alert(err.response?.data?.error || 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3 text-indigo-600">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold animate-pulse">Loading user profile & financial history...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-2xl p-6 text-center max-w-lg mx-auto my-12">
        <p className="font-bold text-lg mb-2">User Not Found</p>
        <p className="text-sm text-orange-600">{error || 'Requested user does not exist'}</p>
        <Link to="/admin/users" className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-xs">
          Return to User List
        </Link>
      </div>
    );
  }

  const totalIncome = Number(user.total_income || 0);
  const totalExpense = Number(user.total_expense || 0);
  const balance = totalIncome - totalExpense;

  const barReportData = (reports || []).map(r => ({
    month: r.month_label,
    Income: Number(r.income),
    Expense: Number(r.expense),
    Savings: Number(r.net_savings)
  })).reverse();

  return (
    <div className="flex flex-col gap-7 fade-in">
      {/* Top Breadcrumb Nav */}
      <div>
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition mb-2">
          <ArrowLeft size={14} />
          Back to User Management
        </Link>
      </div>

      {/* User Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl uppercase shadow-lg ${
            user.role === 'admin' 
              ? 'bg-indigo-600 text-white shadow-indigo-600/30' 
              : 'bg-slate-900 text-white shadow-slate-900/20'
          }`}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{user.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {user.role}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                user.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {user.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <Mail size={13} className="text-slate-400" />
              {user.email}
            </p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
              <Calendar size={13} className="text-slate-400" />
              Joined {new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={handleToggleStatus}
            disabled={actionLoading}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition shadow-sm ${
              user.status === 'active'
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {actionLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : user.status === 'active' ? (
              <>
                <UserX size={14} />
                Deactivate User Account
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                Restore / Activate Account
              </>
            )}
          </button>
        </div>
      </div>

      {/* User Quick Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Income" value={`₹${totalIncome.toLocaleString()}`} accent="text-emerald-600" icon={TrendingUp} />
        <StatCard label="Total Expense" value={`₹${totalExpense.toLocaleString()}`} accent="text-rose-500" icon={TrendingDown} />
        <StatCard label="Net Balance" value={`₹${balance.toLocaleString()}`} accent={balance >= 0 ? 'text-indigo-600' : 'text-rose-500'} icon={Wallet} />
        <StatCard label="Transactions" value={user.transaction_count} accent="text-blue-600" icon={ArrowLeftRight} />
      </div>

      {/* Detail Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'profile', label: 'Profile & Metadata', icon: User },
          { id: 'transactions', label: `Transactions (${txns.length})`, icon: ArrowLeftRight },
          { id: 'categories', label: `Categories (${categories.length})`, icon: Tags },
          { id: 'budgets', label: `Budgets (${budgets.length})`, icon: PiggyBank },
          { id: 'reports', label: 'Monthly Reports', icon: BarChart3 },
          { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}

      {/* TAB 1: PROFILE & METADATA */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User size={16} className="text-indigo-600" /> Account Specifications
            </h2>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400 font-medium">User Database ID</span>
                <span className="font-mono font-bold text-slate-800">#{user.id}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400 font-medium">Full Name</span>
                <span className="font-bold text-slate-800">{user.name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400 font-medium">Email Address</span>
                <span className="font-bold text-slate-800">{user.email}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400 font-medium">Access Role</span>
                <span className="font-bold uppercase text-indigo-600">{user.role}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400 font-medium">Account Status</span>
                <span className={`font-bold uppercase ${user.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {user.status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" /> Account Lifecycle & Audit Info
            </h2>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400 font-medium">Account Created Date</span>
                <span className="font-bold text-slate-800">
                  {new Date(user.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400 font-medium">Last Modified Timestamp</span>
                <span className="font-bold text-slate-800">
                  {user.updated_at ? new Date(user.updated_at).toLocaleString('en-IN') : 'N/A'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400 font-medium">Deletion Timestamp</span>
                <span className="font-bold text-slate-800">
                  {user.deleted_at ? new Date(user.deleted_at).toLocaleString('en-IN') : 'None (Active)'}
                </span>
              </div>
              {user.deleted_by_name && (
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400 font-medium">Deactivated By</span>
                  <span className="font-bold text-rose-600">{user.deleted_by_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden fade-in">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">User Transaction History</h2>
            <span className="text-xs text-slate-400 font-semibold">Total {txns.length} records</span>
          </div>
          {txns.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {txns.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {t.category_name || 'Uncategorized'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{t.description || '—'}</td>
                      <td className={`py-3 px-4 text-right font-extrabold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">No transactions recorded for this user</p>
          )}
        </div>
      )}

      {/* TAB 3: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
          {categories.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  c.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                }`}>
                  {c.type}
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1">{c.name}</p>
                <p className="text-[11px] text-slate-400">{c.txn_count} transactions recorded</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-slate-800">₹{Number(c.total_spent).toLocaleString()}</span>
                <p className="text-[10px] text-slate-400 mt-0.5">{c.user_id ? 'Custom' : 'System Default'}</p>
              </div>
            </div>
          ))}
          {!categories.length && (
            <p className="col-span-full text-xs text-slate-400 text-center py-8">No categories assigned</p>
          )}
        </div>
      )}

      {/* TAB 4: BUDGETS */}
      {activeTab === 'budgets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-in">
          {budgets.map(b => {
            const pct = Math.min(Number(b.pct_used || 0), 100);
            return (
              <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{b.category_name}</h3>
                    <p className="text-[11px] text-slate-400">Month {b.month}/{b.year}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    pct >= 90 ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {b.pct_used}% used
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${pct >= 90 ? 'bg-rose-500' : 'bg-indigo-600'}`} 
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Spent: <strong className="text-slate-800">₹{Number(b.spent).toLocaleString()}</strong></span>
                  <span>Limit: <strong className="text-slate-800">₹{Number(b.limit_amount).toLocaleString()}</strong></span>
                </div>
              </div>
            );
          })}
          {!budgets.length && (
            <p className="col-span-full text-xs text-slate-400 text-center py-8">No active monthly budgets configured</p>
          )}
        </div>
      )}

      {/* TAB 5: MONTHLY REPORTS */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-6 fade-in">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Monthly Income vs Expenses Trend</h2>
            {barReportData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barReportData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v)=>`₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...TooltipStyle} formatter={(v)=>`₹${Number(v).toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[5,5,0,0]} />
                  <Bar dataKey="Expense" fill="#f43f5e" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No monthly reports available</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden fade-in">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/80">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">User Audit Event History</h2>
          </div>
          {auditLogs.length ? (
            <div className="divide-y divide-slate-100 text-xs">
              {auditLogs.map(log => (
                <div key={log.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-slate-600 font-medium">{log.detail}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      By {log.actor_name} ({log.actor_role}) · IP: {log.ip_address || '127.0.0.1'}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">No audit records logged for this user</p>
          )}
        </div>
      )}
    </div>
  );
}
