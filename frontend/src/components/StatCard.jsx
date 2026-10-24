export default function StatCard({ label, value, accent = 'text-brand-700', icon: Icon }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 border border-brand-100 bg-white transition-all duration-200 card">
      {/* Subtle corner decoration */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-brand-50 opacity-70" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">{label}</p>
          <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
        </div>
        {Icon && (
          <div className="bg-brand-50 rounded-xl p-2.5 shrink-0">
            <Icon size={20} className={accent} />
          </div>
        )}
      </div>
    </div>
  );
}
