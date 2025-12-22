"use client";

import { memo, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useFeedStore } from "@/store/useFeedStore";
import { NewsCard } from "@/components/reel/NewsCard";

// =============================================================================
// TYPES
// =============================================================================

interface FeedContainerProps {
  /** Callback to load more items */
  onLoadMore?: () => void;
  /** Whether more items are being loaded */
  loadingMore?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

function FeedContainerComponent({
  onLoadMore,
  loadingMore = false,
  hasMore = true,
}: FeedContainerProps) {
  const feed = useFeedStore((state) => state.feed);
  const activeIndex = useFeedStore((state) => state.activeIndex);

  // Only render cards within viewport range (optimization)
  const visibleRange = useMemo(() => {
    const start = Math.max(0, activeIndex - 1);
    const end = Math.min(feed.length - 1, activeIndex + 2);
    return { start, end };
  }, [activeIndex, feed.length]);

  // Trigger load more when approaching the end (3 cards before end)
  useEffect(() => {
    const threshold = 3;
    const shouldLoadMore = 
      activeIndex >= feed.length - threshold && 
      hasMore && 
      !loadingMore &&
      feed.length > 0;

    if (shouldLoadMore && onLoadMore) {
      console.log(`[FeedContainer] Loading more... (index: ${activeIndex}, total: ${feed.length})`);
      onLoadMore();
    }
  }, [activeIndex, feed.length, hasMore, loadingMore, onLoadMore]);

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

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="h-[100dvh] w-full flex-shrink-0 flex items-center justify-center bg-gradient-to-b from-[#05060a] to-[#0a0c14]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-white/70 text-sm">Loading more news...</p>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Progress Indicator */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1">
        {feed.slice(0, Math.min(feed.length, 10)).map((_, index) => (
          <motion.div
            key={index}
            className={`w-1 rounded-full transition-all duration-300 ${
              index === activeIndex % 10
                ? "h-6 bg-sky-400"
                : index < activeIndex % 10
                ? "h-2 bg-white/30"
                : "h-2 bg-white/10"
            }`}
          />
        ))}
        {feed.length > 10 && (
          <div className="text-[10px] text-white/40 text-center mt-1">
            +{feed.length - 10}
          </div>
        )}
      </div>

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

      {/* End of Feed Indicator */}
      <AnimatePresence>
        {!hasMore && activeIndex === feed.length - 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <p className="text-white/70 text-xs">You've reached the end</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const FeedContainer = memo(FeedContainerComponent);
export default FeedContainer;
