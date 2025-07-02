import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface LiveUpdateBadgeProps {
  show: boolean;
}

export const LiveUpdateBadge = ({ show }: LiveUpdateBadgeProps) => {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Zap className="h-3 w-3" />
      </motion.div>
      <span>Live</span>
    </motion.div>
  );
};