/**
 * @file src/hooks/useNewsFeed.ts
 * @description Data fetching logic hook for the news feed.
 * Handles loading states, errors, pagination, and store integration.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { newsClient } from "@/services/api/newsClient";
import { useFeedStore } from "@/store/useFeedStore";
import type { FeedResponse } from "@/types/schema";

// =============================================================================
// TYPES
// =============================================================================

interface UseNewsFeedOptions {
  /** Initial search query (optional) */
  initialQuery?: string;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

interface UseNewsFeedReturn {
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether more items can be loaded */
  hasMore: boolean;
  /** Fetch/refresh the feed */
  fetchFeed: (query?: string) => Promise<void>;
  /** Load more items (pagination) */
  loadMore: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useNewsFeed(
  options: UseNewsFeedOptions = {}
): UseNewsFeedReturn {
  const { initialQuery = "", autoFetch = true } = options;

  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Pagination cursor ref (doesn't trigger re-renders)
  const cursorRef = useRef<string | undefined>(undefined);

  // Store actions
  const setFeed = useFeedStore((state) => state.setFeed);
  const appendItems = useFeedStore((state) => state.appendItems);
  const resetFeed = useFeedStore((state) => state.resetFeed);
  const setQuery = useFeedStore((state) => state.setQuery);
  const storeQuery = useFeedStore((state) => state.query);

  /**
   * Fetch feed data (fresh fetch, replaces existing data)
   */
  const fetchFeed = useCallback(
    async (query?: string) => {
      const searchQuery = query ?? storeQuery ?? initialQuery;

      setLoading(true);
      setError(null);
      cursorRef.current = undefined;

      try {
        // Reset store before fetching
        resetFeed();
        
        if (searchQuery) {
          setQuery(searchQuery);
        }

        let response: FeedResponse;

        if (searchQuery && searchQuery.trim()) {
          response = await newsClient.searchFeed(searchQuery.trim());
        } else {
          response = await newsClient.getFeed();
        }

        setFeed(response.results);
        cursorRef.current = response.next_cursor ?? undefined;
        setHasMore(!!response.next_cursor || response.results.length > 0);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch news feed";
        setError(message);
        console.error("[useNewsFeed] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [initialQuery, storeQuery, setFeed, resetFeed, setQuery]
  );

  /**
   * Load more items (pagination)
   */
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const searchQuery = storeQuery || initialQuery;
      let response: FeedResponse;

      if (searchQuery && searchQuery.trim()) {
        response = await newsClient.searchFeed(
          searchQuery.trim(),
          cursorRef.current
        );
      } else {
        response = await newsClient.getFeed(cursorRef.current);
      }

      if (response.results.length > 0) {
        appendItems(response.results);
        cursorRef.current = response.next_cursor ?? undefined;
      }

      setHasMore(!!response.next_cursor);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load more items";
      setError(message);
      console.error("[useNewsFeed] LoadMore error:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, storeQuery, initialQuery, appendItems]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Auto-fetch on mount or when initialQuery changes
   */
  useEffect(() => {
    if (autoFetch) {
      fetchFeed(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return {
    loading,
    error,
    hasMore,
    fetchFeed,
    loadMore,
    clearError,
  };
}

export default useNewsFeed;
