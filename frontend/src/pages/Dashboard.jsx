import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, ReceiptText } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import client from '../api/client';
import StatCard from '../components/StatCard.jsx';

const PIE_COLORS = ['#3b82f6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f87171', '#a78bfa'];

const TooltipStyle = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #bfdbfe',
    borderRadius: 10,
    boxShadow: '0 4px 16px 0 rgba(37,99,235,0.12)',
    color: '#1e3a8a',
    fontSize: 12,
  },
  labelStyle: { color: '#1e40af', fontWeight: 600 },
};

export default function Dashboard() {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  
  const [summary, setSummary] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [txns, setTxns] = useState([]);
  const [totalTxnsCount, setTotalTxnsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      const currentYear = parseInt(selectedDate.split('-')[0], 10);
      const currentMonth = parseInt(selectedDate.split('-')[1], 10);
      
      const from = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const to = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [summaryRes, breakdownRes, txnRes] = await Promise.all([
        client.get('/reports/monthly-summary'),
        client.get('/reports/category-breakdown', { params: { month: currentMonth, year: currentYear } }),
        client.get('/transactions', { params: { limit: 5, from, to } }),
      ]);

      if (ignore) return;
      
      const allSummary = summaryRes.data;
      // Find the index of the selected month in the summary, or figure out where it should be
      const selectedIndex = allSummary.findIndex(s => {
        if (!s.month) return false;
        const str = String(s.month);
        const y = parseInt(str.slice(0, 4), 10);
        const m = parseInt(str.slice(5, 7), 10);
        return y === currentYear && m === currentMonth;
      });
      
      let relevantSummary = [];
      if (selectedIndex !== -1) {
        relevantSummary = allSummary.slice(selectedIndex, selectedIndex + 6).reverse();
      } else {
        // If no data for this month, just take up to 6 months prior to this date
        relevantSummary = allSummary.filter(s => {
          const str = String(s.month);
          const y = parseInt(str.slice(0, 4), 10);
          const m = parseInt(str.slice(5, 7), 10);
          return new Date(y, m - 1) <= new Date(currentYear, currentMonth - 1);
        }).slice(0, 6).reverse();
      }
      
      // Ensure we always have the current month in the summary object for the stat cards to read
      let fullSummaryForCards = allSummary;
      if (selectedIndex === -1) {
        fullSummaryForCards = [{
          month: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00.000Z`,
          total_income: 0,
          total_expense: 0,
          net: 0
        }, ...allSummary];
      }

      setSummary(fullSummaryForCards);
      setBreakdown(breakdownRes.data.map(item => ({
        ...item,
        total_spent: Number(item.total_spent)
      })));
      setTxns(txnRes.data.data);
      setTotalTxnsCount(txnRes.data.total || 0);
      setLoading(false);
    }
    load();
    return () => { ignore = true; };
  }, [selectedDate]);

  const currentYear = parseInt(selectedDate.split('-')[0], 10);
  const currentMonth = parseInt(selectedDate.split('-')[1], 10);

  const currentMonthData = summary.find((s) => {
    if (!s.month) return false;
    const str = String(s.month);
    const y = parseInt(str.slice(0, 4), 10);
    const m = parseInt(str.slice(5, 7), 10);
    return y === currentYear && m === currentMonth;
  });

  const totalIncome  = Number(currentMonthData?.total_income  || 0);
  const totalExpense = Number(currentMonthData?.total_expense || 0);
  const balance      = totalIncome - totalExpense;

  // We want the charts to display the relevant history ending at selectedDate
  let chartSummary = summary;
  const selectedIdx = summary.findIndex(s => {
    if (!s.month) return false;
    const str = String(s.month);
    const y = parseInt(str.slice(0, 4), 10);
    const m = parseInt(str.slice(5, 7), 10);
    return y === currentYear && m === currentMonth;
  });
  if (selectedIdx !== -1) {
    chartSummary = summary.slice(selectedIdx, selectedIdx + 6);
  }
  
  // Make sure it's sorted chronologically for the charts
  const sortedChartSummary = [...chartSummary].sort((a, b) => new Date(a.month) - new Date(b.month));

  const barData = sortedChartSummary.map((s) => {
    const str = String(s.month);
    const y = parseInt(str.slice(0, 4), 10);
    const m = parseInt(str.slice(5, 7), 10) - 1;
    return {
      month:   new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short' }),
      Income:  Number(s.total_income),
      Expense: Number(s.total_expense),
    };
  });

  const lineData = sortedChartSummary.map((s) => {
    const str = String(s.month);
    const y = parseInt(str.slice(0, 4), 10);
    const m = parseInt(str.slice(5, 7), 10) - 1;
    return {
      month: new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short' }),
      Net:   Number(s.net),
    };
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-400 animate-pulse text-sm font-medium">Loading dashboard…</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-7 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Financial overview for selected month</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="month-select" className="text-sm font-semibold text-slate-600">Month:</label>
          <input
            id="month-select"
            type="month"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input !w-auto !py-1.5 !px-3 text-sm"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Income"       value={`₹${totalIncome.toLocaleString()}`}  accent="text-green-600"  icon={TrendingUp} />
        <StatCard label="Expense"      value={`₹${totalExpense.toLocaleString()}`} accent="text-red-500"    icon={TrendingDown} />
        <StatCard label="Balance"      value={`₹${balance.toLocaleString()}`}      accent={balance >= 0 ? 'text-brand-700' : 'text-red-500'} icon={Wallet} />
        <StatCard label="Transactions" value={totalTxnsCount}                      accent="text-brand-600"  icon={ReceiptText} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="card">
          <h2 className="text-sm font-bold text-brand-800 mb-4">Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v)=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip {...TooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Income"  fill="#16a34a" radius={[5,5,0,0]} />
              <Bar dataKey="Expense" fill="#dc2626" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="text-sm font-bold text-brand-800 mb-4">Spending by Category</h2>
          {breakdown.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={breakdown} dataKey="total_spent" nameKey="name" outerRadius={78} innerRadius={36} paddingAngle={3}>
                  {breakdown.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip {...TooltipStyle} formatter={(v)=>`₹${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p className="text-sm">No expense data this month</p>
            </div>
          )}
        </div>

        {/* Line chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-bold text-brand-800 mb-4">Net Balance Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v)=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip {...TooltipStyle} formatter={(v)=>`₹${Number(v).toLocaleString()}`} />
              <Line type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <h2 className="text-sm font-bold text-brand-800 mb-4">Recent Transactions</h2>
        <div className="flex flex-col divide-y divide-slate-100">
          {txns.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                  t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                }`}>
                  {t.type === 'income' ? '↑' : '↓'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{t.category_name || 'Uncategorized'}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(t.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                    {t.description ? ` · ${t.description}` : ''}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
              </span>
            </div>
          ))}
          {!txns.length && (
            <p className="text-slate-400 text-sm py-6 text-center">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
