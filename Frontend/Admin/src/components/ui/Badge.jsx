export default function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-2xl text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}