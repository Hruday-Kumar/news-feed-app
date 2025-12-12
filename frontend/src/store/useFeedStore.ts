/**
 * @file src/store/useFeedStore.ts
 * @description Global state management for the news feed using Zustand.
 * Handles feed data, navigation index, and UI preferences.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { NewsCard } from "@/types/schema";

// =============================================================================
// STATE INTERFACE
// =============================================================================

interface FeedState {
  /** Array of news cards in the current feed */
  feed: NewsCard[];
  /** Currently visible card index (0-based) */
  activeIndex: number;
  /** Whether audio/video is muted */
  isMuted: boolean;
  /** Current search query */
  query: string;
}

interface FeedActions {
  /** Replace the entire feed with new items */
  setFeed: (items: NewsCard[]) => void;
  /** Append items to existing feed (for pagination) */
  appendItems: (items: NewsCard[]) => void;
  /** Navigate to the next card (with bounds check) */
  nextCard: () => void;
  /** Navigate to the previous card (with bounds check) */
  prevCard: () => void;
  /** Jump to a specific card index */
  goToCard: (index: number) => void;
  /** Toggle mute state */
  toggleMute: () => void;
  /** Set the search query */
  setQuery: (query: string) => void;
  /** Reset feed to initial state */
  resetFeed: () => void;
}

type FeedStore = FeedState & FeedActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: FeedState = {
  feed: [],
  activeIndex: 0,
  isMuted: true,
  query: "",
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useFeedStore = create<FeedStore>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // Actions
      setFeed: (items: NewsCard[]) => {
        set({ feed: items, activeIndex: 0 }, false, "setFeed");
      },

      appendItems: (items: NewsCard[]) => {
        const { feed } = get();
        // Deduplicate by URL
        const existingUrls = new Set(feed.map((item) => item.url));
        const newItems = items.filter((item) => !existingUrls.has(item.url));
        set({ feed: [...feed, ...newItems] }, false, "appendItems");
      },

      nextCard: () => {
        const { activeIndex, feed } = get();
        if (activeIndex < feed.length - 1) {
          set({ activeIndex: activeIndex + 1 }, false, "nextCard");
        }
      },

      prevCard: () => {
        const { activeIndex } = get();
        if (activeIndex > 0) {
          set({ activeIndex: activeIndex - 1 }, false, "prevCard");
        }
      },

      goToCard: (index: number) => {
        const { feed } = get();
        const clampedIndex = Math.max(0, Math.min(index, feed.length - 1));
        set({ activeIndex: clampedIndex }, false, "goToCard");
      },

      toggleMute: () => {
        const { isMuted } = get();
        set({ isMuted: !isMuted }, false, "toggleMute");
      },

      setQuery: (query: string) => {
        set({ query }, false, "setQuery");
      },

      resetFeed: () => {
        set(initialState, false, "resetFeed");
      },
    }),
    { name: "FeedStore" }
  )
);

// =============================================================================
// SELECTOR HOOKS (Performance Optimization)
// =============================================================================

/** Get the currently active news card */
export const useActiveCard = (): NewsCard | null => {
  return useFeedStore((state) =>
    state.feed.length > 0 ? state.feed[state.activeIndex] : null
  );
};

/** Get feed length */
export const useFeedLength = (): number => {
  return useFeedStore((state) => state.feed.length);
};

/** Check if we're at the last card */
export const useIsLastCard = (): boolean => {
  return useFeedStore(
    (state) => state.activeIndex >= state.feed.length - 1
  );
};
