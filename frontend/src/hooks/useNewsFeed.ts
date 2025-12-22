/**
 * @file src/hooks/useNewsFeed.ts
 * @description Data fetching logic hook for the news feed.
 * Handles loading states, errors, pagination, and store integration.
 */

import { useCallback, useEffect, useState, useRef } from "react";
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
  /** Loading state for initial fetch */
  loading: boolean;
  /** Loading state for loading more */
  loadingMore: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether more items can be loaded */
  hasMore: boolean;
  /** Current page number */
  page: number;
  /** Fetch/refresh the feed */
  fetchFeed: (query?: string) => Promise<void>;
  /** Load more items (pagination) */
  loadMore: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
  /** Manually set hasMore (for external data loading) */
  setHasMoreManual: (value: boolean) => void;
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Ref to prevent duplicate requests
  const isLoadingRef = useRef(false);

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
      setPage(1);
      setHasMore(true);

      try {
        // Reset store before fetching
        resetFeed();
        
        if (searchQuery) {
          setQuery(searchQuery);
        }

        let response: FeedResponse;

        if (searchQuery && searchQuery.trim()) {
          response = await newsClient.searchFeed(searchQuery.trim(), 1);
        } else {
          response = await newsClient.getFeed(1);
        }

        setFeed(response.results);
        setHasMore(response.has_more ?? response.results.length >= 10);
        setPage(1);
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
    // Prevent duplicate requests
    if (isLoadingRef.current || !hasMore) return;
    
    isLoadingRef.current = true;
    setLoadingMore(true);
    setError(null);

    const nextPage = page + 1;

    try {
      const searchQuery = storeQuery || initialQuery;
      let response: FeedResponse;

      if (searchQuery && searchQuery.trim()) {
        response = await newsClient.searchFeed(searchQuery.trim(), nextPage);
      } else {
        response = await newsClient.getFeed(nextPage);
      }

      if (response.results.length > 0) {
        appendItems(response.results);
        setPage(nextPage);
        setHasMore(response.has_more ?? response.results.length >= 10);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load more items";
      setError(message);
      console.error("[useNewsFeed] LoadMore error:", err);
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [hasMore, page, storeQuery, initialQuery, appendItems]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Manually set hasMore (for external data sources like personalized feed)
   */
  const setHasMoreManual = useCallback((value: boolean) => {
    setHasMore(value);
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
    loadingMore,
    error,
    hasMore,
    page,
    fetchFeed,
    loadMore,
    clearError,
    setHasMoreManual,
  };
}

export default useNewsFeed;
