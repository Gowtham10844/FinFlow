import { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, Search, Clock, User, HardDrive } from 'lucide-react';
import client from '../../api/client';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterText, setFilterText] = useState('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/admin/audit-logs?limit=200');
      setLogs(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch system audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.action?.toLowerCase().includes(filterText.toLowerCase()) ||
    l.actor_name?.toLowerCase().includes(filterText.toLowerCase()) ||
    l.detail?.toLowerCase().includes(filterText.toLowerCase()) ||
    l.target_table?.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-1">Append-only immutable record of all administrative and security operations</p>
        </div>
        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Logs
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, actor, or detail..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Showing {filteredLogs.length} of {logs.length} audit entries
        </span>
      </div>

      {/* Log List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold animate-pulse">
            Loading audit records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-orange-500 text-xs font-semibold">{error}</div>
        ) : !filteredLogs.length ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldAlert className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-xs font-bold text-slate-600">No audit events match your search</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                      <span className="font-bold text-slate-800">{log.detail}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <User size={11} /> Actor: <strong className="text-slate-600">{log.actor_name || 'System'}</strong> ({log.actor_role || 'system'})
                      </span>
                      {log.target_table && (
                        <span className="flex items-center gap-1">
                          <HardDrive size={11} /> Target: <strong className="text-slate-600">{log.target_table} #{log.target_id}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right sm:text-right text-[11px] text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
