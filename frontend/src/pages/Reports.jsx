import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import client from '../api/client';

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

export default function Reports() {
  const [topCategories, setTopCategories] = useState([]);
  const [yoy, setYoy] = useState([]);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      client.get('/reports/top-categories'),
      client.get('/reports/year-over-year'),
    ]).then(([topRes, yoyRes]) => {
      if (ignore) return;
      setTopCategories(topRes.data);
      setYoy(yoyRes.data);
    }).catch((err) => {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('Failed to load reports:', err);
      }
    });
    return () => { ignore = true; };
  }, []);

  const yoyData = yoy.map((y) => ({
    year:    y.year,
    Income:  Number(y.total_income),
    Expense: Number(y.total_expense),
  }));

  const maxSpent = topCategories.length ? Math.max(...topCategories.map((c) => Number(c.total_spent))) : 1;

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="page-sub">SQL-powered aggregation reports</p>
      </div>

      {/* Top 5 spending categories */}
      <div className="card">
        <h2 className="text-sm font-bold text-brand-800 mb-5">Top 5 Spending Categories</h2>
        <div className="flex flex-col gap-3">
          {topCategories.map((c, i) => {
            const pct = (Number(c.total_spent) / maxSpent) * 100;
            const colors = ['bg-brand-600','bg-indigo-500','bg-cyan-500','bg-violet-500','bg-pink-500'];
            return (
              // React R4 fix: use c.name (stable data identifier) instead of array index i
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold text-slate-700">{i + 1}. {c.name}</span>
                  <span className="font-bold text-red-500">₹{Number(c.total_spent).toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[i] || 'bg-brand-600'} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {!topCategories.length && (
            <p className="text-slate-400 text-sm py-6 text-center">No expense data yet</p>
          )}
        </div>
      </div>

      {/* Year-over-Year */}
      <div className="card">
        <h2 className="text-sm font-bold text-brand-800 mb-4">Year-over-Year Comparison</h2>
        {yoyData.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={yoyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
              <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v)=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip {...TooltipStyle} formatter={(v)=>`₹${Number(v).toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Income"  fill="#16a34a" radius={[5,5,0,0]} />
              <Bar dataKey="Expense" fill="#dc2626" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-400 text-sm py-10 text-center">Not enough data across years yet</p>
        )}
      </div>
    </div>
  );
}
