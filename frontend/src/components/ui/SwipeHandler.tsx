"use client";

import { type ReactNode, useRef, useEffect } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { useSwipe } from "@/hooks/useSwipe";

// =============================================================================
// TYPES
// =============================================================================

interface SwipeHandlerProps {
  children: ReactNode;
  enabled?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SwipeHandler({
  children,
  enabled = true,
  className = "",
}: SwipeHandlerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { handlers, yOffset, isSwiping } = useSwipe({ enabled });

  // Motion values for smooth animations
  const y = useMotionValue(0);
  const scale = useTransform(y, [-100, 0, 100], [0.98, 1, 0.98]);
  const opacity = useTransform(y, [-100, 0, 100], [0.9, 1, 0.9]);

  // Update motion value when yOffset changes
  useEffect(() => {
    y.set(yOffset * 0.5); // Dampen the drag effect
  }, [yOffset, y]);

  // Focus container for keyboard events
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`outline-none touch-pan-y ${className}`}
      style={{ y, scale, opacity }}
      animate={{
        y: isSwiping ? yOffset * 0.3 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      tabIndex={0}
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
      onWheel={handlers.onWheel}
      onKeyDown={handlers.onKeyDown}
    >
      {children}
    </motion.div>
  );
}

export default SwipeHandler;
