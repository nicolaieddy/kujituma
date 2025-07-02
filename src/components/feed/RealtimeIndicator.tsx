import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap } from "lucide-react";

interface RealtimeIndicatorProps {
  newPostsCount: number;
  onRefresh: () => void;
}

export const RealtimeIndicator = ({ newPostsCount, onRefresh }: RealtimeIndicatorProps) => {
  if (newPostsCount === 0) {
    return (
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <Zap className="h-4 w-4 text-green-400" />
        <span>Live updates enabled</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Button
        onClick={onRefresh}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 h-12"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        <span>
          {newPostsCount === 1 
            ? `${newPostsCount} new update available` 
            : `${newPostsCount} new updates available`}
        </span>
      </Button>
    </motion.div>
  );
};