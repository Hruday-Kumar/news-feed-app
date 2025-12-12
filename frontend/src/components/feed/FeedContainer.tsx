"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFeedStore } from "@/store/useFeedStore";
import { NewsCard } from "@/components/reel/NewsCard";

// =============================================================================
// COMPONENT
// =============================================================================

function FeedContainerComponent() {
  const feed = useFeedStore((state) => state.feed);
  const activeIndex = useFeedStore((state) => state.activeIndex);

  // Only render cards within viewport range (optimization)
  const visibleRange = useMemo(() => {
    const start = Math.max(0, activeIndex - 1);
    const end = Math.min(feed.length - 1, activeIndex + 1);
    return { start, end };
  }, [activeIndex, feed.length]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <motion.div
        className="h-full w-full"
        animate={{
          y: `-${activeIndex * 100}%`,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        {feed.map((item, index) => {
          // Render placeholder for out-of-range cards
          const isInRange =
            index >= visibleRange.start && index <= visibleRange.end;

          if (!isInRange) {
            return (
              <div
                key={item.url}
                className="h-[100dvh] w-full flex-shrink-0"
                aria-hidden="true"
              />
            );
          }

          return (
            <NewsCard
              key={item.url}
              item={item}
              isActive={index === activeIndex}
              index={index}
              total={feed.length}
            />
          );
        })}
      </motion.div>

      {/* Swipe Hint (shown briefly on first card) */}
      <AnimatePresence>
        {activeIndex === 0 && feed.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: 3, duration: 1 }}
              className="flex flex-col items-center gap-1 text-white/50 text-xs"
            >
              <span>Swipe up for more</span>
              <span className="text-lg">↑</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const FeedContainer = memo(FeedContainerComponent);
export default FeedContainer;
