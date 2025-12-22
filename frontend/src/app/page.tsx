"use client";

import { useState, useCallback, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, RefreshCw, Sparkles, User, Plus, Bookmark } from "lucide-react";
import { useFeedStore } from "@/store/useFeedStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useNewsFeed } from "@/hooks/useNewsFeed";
import { authClient } from "@/services/api/authClient";
import { SwipeHandler } from "@/components/ui/SwipeHandler";
import { FeedContainer } from "@/components/feed/FeedContainer";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserPanel } from "@/components/user/UserPanel";
import { TopicsManager } from "@/components/topics/TopicsManager";

// =============================================================================
// SEARCH HEADER COMPONENT
// =============================================================================

function SearchHeader({
  onSearch,
  loading,
  onUserClick,
  onSaveTopic,
  currentQuery,
}: {
  onSearch: (query: string) => void;
  loading: boolean;
  onUserClick: () => void;
  onSaveTopic: (topic: string) => void;
  currentQuery: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { user, token } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
      setIsExpanded(false);
    }
  };

  const handleQuickTag = (tag: string) => {
    setInputValue(tag);
    onSearch(tag);
    setIsExpanded(false);
  };

  const handleSaveTopic = async () => {
    if (!currentQuery || !token) return;
    setIsSaving(true);
    try {
      await onSaveTopic(currentQuery);
    } finally {
      setIsSaving(false);
    }
  };

  // Show user's saved topics as quick tags if logged in
  const quickTags = user?.saved_topics?.length 
    ? user.saved_topics.slice(0, 5) 
    : ["Space", "Cricket", "AI", "Climate", "Startups"];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <motion.div
          layout
          className="bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
        >
          {/* Collapsed Header */}
          <div className="flex items-center gap-3 p-3">
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/30"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <div className="leading-none">
                <p className="font-bold text-sm text-white">Briefly</p>
                <p className="text-[10px] text-white/50">AI News</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-colors"
            >
              <Search className="w-4 h-4 text-white/50" />
              <span className="text-sm text-white/50 truncate">
                {inputValue || "Search news..."}
              </span>
            </button>

            {loading && (
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
            )}

            {/* Save Topic Button */}
            {user && currentQuery && !loading && (
              <motion.button
                type="button"
                onClick={handleSaveTopic}
                disabled={isSaving || user.saved_topics.includes(currentQuery)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-sky-400 hover:border-sky-400/30 transition-all disabled:opacity-50"
                title={user.saved_topics.includes(currentQuery) ? "Topic already saved" : "Save this topic"}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : user.saved_topics.includes(currentQuery) ? (
                  <Bookmark className="w-4 h-4 fill-current text-sky-400" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </motion.button>
            )}

            {/* User Button */}
            <motion.button
              type="button"
              onClick={onUserClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all"
            >
              {user ? (
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <User className="w-4 h-4" />
              )}
            </motion.button>
          </div>

          {/* Expanded Search */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 space-y-3">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search any topic..."
                      autoFocus
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 text-sm outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20 transition-all"
                      value={inputValue}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setInputValue(e.target.value)
                      }
                    />
                    <motion.button
                      type="submit"
                      disabled={loading || !inputValue.trim()}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/25"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </motion.button>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    {quickTags.map((tag) => (
                      <motion.button
                        key={tag}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickTag(tag)}
                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 hover:border-sky-400/30 transition-all"
                      >
                        {tag}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </header>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#05060a] to-[#0a0c14]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 rounded-full border-2 border-sky-400/30 border-t-sky-400"
        />
        <div className="text-center">
          <p className="text-white font-medium">Reading articles</p>
          <p className="text-white/50 text-sm">AI is summarizing...</p>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#05060a] to-[#0a0c14] px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 max-w-sm text-center"
      >
        <div className="h-16 w-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
          <span className="text-3xl">😕</span>
        </div>
        <div>
          <p className="text-white font-medium mb-1">Something went wrong</p>
          <p className="text-white/50 text-sm">{error}</p>
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm font-medium text-white hover:bg-white/15 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try again</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

function EmptyState({ onSearch }: { onSearch: (query: string) => void }) {
  const suggestions = ["Space exploration", "AI breakthroughs", "Climate news"];

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#05060a] to-[#0a0c14] px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 max-w-sm text-center"
      >
        <motion.div
          animate={{
            y: [0, -8, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="h-20 w-20 rounded-2xl bg-gradient-to-br from-sky-400/20 to-blue-500/20 flex items-center justify-center border border-sky-400/20"
        >
          <Sparkles className="w-10 h-10 text-sky-400" />
        </motion.div>

        <div>
          <h2 className="text-xl font-bold text-white mb-2">
            Discover AI-Summarized News
          </h2>
          <p className="text-white/50 text-sm">
            Search any topic to get bite-sized news summaries powered by AI
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Try searching
          </p>
          {suggestions.map((suggestion, i) => (
            <motion.button
              key={suggestion}
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSearch(suggestion)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 text-left hover:bg-white/10 hover:border-sky-400/30 transition-all"
            >
              🔍 {suggestion}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function Home() {
  const feed = useFeedStore((state) => state.feed);
  const setFeed = useFeedStore((state) => state.setFeed);
  const query = useFeedStore((state) => state.query);
  const { user, token, updateTopics } = useAuthStore();
  const { 
    loading, 
    loadingMore, 
    error, 
    hasMore, 
    fetchFeed, 
    loadMore, 
    clearError,
    setHasMoreManual 
  } = useNewsFeed({
    autoFetch: false,
  });
  
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState(false);

  // Load personalized feed on login
  useEffect(() => {
    const loadPersonalizedFeed = async () => {
      if (user && token && user.saved_topics.length > 0 && feed.length === 0) {
        setIsLoadingPersonalized(true);
        try {
          const result = await authClient.getPersonalizedFeed(token);
          if (result.results.length > 0) {
            setFeed(result.results);
            // Personalized feed doesn't support pagination - mark as no more
            setHasMoreManual(false);
          }
        } catch (err) {
          console.error("Failed to load personalized feed:", err);
        } finally {
          setIsLoadingPersonalized(false);
        }
      }
    };
    
    loadPersonalizedFeed();
  }, [user, token, setHasMoreManual]);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      fetchFeed(searchQuery);
    },
    [fetchFeed]
  );

  const handleRetry = useCallback(() => {
    clearError();
    fetchFeed();
  }, [clearError, fetchFeed]);

  const handleUserClick = () => {
    if (user) {
      setShowUserPanel(true);
    } else {
      setShowAuth(true);
    }
  };

  const handleSaveTopic = async (topic: string) => {
    if (!token) return;
    try {
      const result = await authClient.saveTopic(topic, token);
      updateTopics(result.topics);
    } catch (err) {
      console.error("Failed to save topic:", err);
    }
  };

  const handleTopicSearch = (topic: string) => {
    fetchFeed(topic);
  };

  const handleViewFavorites = async () => {
    if (!token) return;
    try {
      const result = await authClient.getFavorites(token);
      if (result.favorites.length > 0) {
        setFeed(result.favorites);
      }
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  };

  // Show auth form if not logged in and user clicks login
  if (showAuth && !user) {
    return (
      <main className="h-[100dvh] w-full bg-[#05060a] text-white overflow-hidden">
        <AuthForm onSuccess={() => setShowAuth(false)} />
      </main>
    );
  }

  // Determine which state to render
  const renderContent = () => {
    if ((loading || isLoadingPersonalized) && feed.length === 0) {
      return <LoadingState />;
    }

    if (error && feed.length === 0) {
      return <ErrorState error={error} onRetry={handleRetry} />;
    }

    if (feed.length === 0) {
      return <EmptyState onSearch={handleSearch} />;
    }

    return (
      <SwipeHandler enabled={feed.length > 0} className="h-full w-full">
        <FeedContainer 
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          hasMore={hasMore}
        />
      </SwipeHandler>
    );
  };

  return (
    <main className="h-[100dvh] w-full bg-[#05060a] text-white overflow-hidden">
      <SearchHeader 
        onSearch={handleSearch} 
        loading={loading || isLoadingPersonalized} 
        onUserClick={handleUserClick}
        onSaveTopic={handleSaveTopic}
        currentQuery={query}
      />
      {renderContent()}
      
      {/* User Panel */}
      <UserPanel 
        isOpen={showUserPanel} 
        onClose={() => setShowUserPanel(false)}
        onTopicSearch={handleTopicSearch}
        onViewFavorites={handleViewFavorites}
      />
    </main>
  );
}
