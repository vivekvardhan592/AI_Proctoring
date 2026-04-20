import { motion } from 'framer-motion';

export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "px-6 py-3.5 rounded-3xl font-medium flex items-center justify-center gap-2 transition-all active:scale-95";
  
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg hover:shadow-xl",
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}