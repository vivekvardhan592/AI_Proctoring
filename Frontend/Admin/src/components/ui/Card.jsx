import { motion } from 'framer-motion';

export default function Card({ children, className = "", ...props }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}