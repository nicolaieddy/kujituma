import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PostAnimationWrapperProps {
  children: ReactNode;
  index: number;
  isNew?: boolean;
}

export const PostAnimationWrapper = ({ children, index, isNew = false }: PostAnimationWrapperProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: isNew ? 0 : index * 0.1,
        ease: "easeOut" 
      }}
      className={isNew ? "ring-2 ring-blue-400/50 rounded-lg" : ""}
    >
      {children}
    </motion.div>
  );
};