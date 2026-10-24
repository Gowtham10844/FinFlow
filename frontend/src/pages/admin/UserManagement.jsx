import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, UserCheck, UserX, RotateCcw, Eye, Shield, Users, RefreshCw } from 'lucide-react';
import client from '../../api/client';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/admin/users', {
        params: { search, status: statusFilter }
      });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleToggleStatus = async (user) => {
    const targetStatus = user.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to set user "${user.name}" to ${targetStatus}?`)) {
      return;
    }

    setActionLoadingId(user.id);
    try {
      if (targetStatus === 'active' && user.deleted_at) {
        await client.post(`/admin/users/${user.id}/restore`);
      } else {
        await client.put(`/admin/users/${user.id}/status`, { status: targetStatus });
      }
      
      // Update local state immediately
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: targetStatus, deleted_at: targetStatus === 'active' ? null : new Date().toISOString() } : u));
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${targetStatus} user`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-xs text-slate-500 mt-1">Directory of registered FinFlow accounts and administrative controls</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={12} /> Status:
          </span>
          {[
            { id: 'all', label: 'All Users' },
            { id: 'active', label: 'Active Only' },
            { id: 'inactive', label: 'Inactive Only' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading && !users.length ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold animate-pulse">
            Loading user list...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-orange-500 text-xs font-semibold">
            {error}
          </div>
        ) : !users.length ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-xs font-bold text-slate-600">No users match your criteria</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or search terms</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Activity</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    {/* User Profile */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs uppercase ${
                          u.role === 'admin' 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <Link to={`/admin/users/${u.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition">
                            {u.name}
                          </Link>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {u.role === 'admin' && <Shield size={10} />}
                        {u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {u.status}
                      </span>
                      {u.deleted_at && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Deactivated</p>
                      )}
                    </td>

                    {/* Activity */}
                    <td className="py-4 px-4">
                      <div className="text-xs">
                        <span className="font-bold text-slate-800">{u.transaction_count}</span> txns
                        <p className="text-[11px] text-slate-400">Spent ₹{Number(u.total_spent).toLocaleString()}</p>
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="py-4 px-4 text-slate-500 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details */}
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 transition"
                          title="View user profile & details"
                        >
                          <Eye size={13} />
                          Details
                        </Link>

                        {/* Activate/Deactivate Toggle */}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoadingId === u.id}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] inline-flex items-center gap-1 transition ${
                            u.status === 'active'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {actionLoadingId === u.id ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : u.status === 'active' ? (
                            <>
                              <UserX size={13} />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <RotateCcw size={13} />
                              Restore / Activate
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
