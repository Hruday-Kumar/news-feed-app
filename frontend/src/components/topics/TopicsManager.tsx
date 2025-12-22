"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Hash, Loader2, Trash2 } from "lucide-react";
import { authClient } from "@/services/api/authClient";
import { useAuthStore } from "@/store/useAuthStore";

// =============================================================================
// TYPES
// =============================================================================

interface TopicsManagerProps {
  onTopicClick?: (topic: string) => void;
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TopicsManager({ onTopicClick, compact = false }: TopicsManagerProps) {
  const { user, token, updateTopics } = useAuthStore();
  const [topics, setTopics] = useState<string[]>(user?.saved_topics || []);
  const [newTopic, setNewTopic] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState<string | null>(null);

  useEffect(() => {
    if (user?.saved_topics) {
      setTopics(user.saved_topics);
    }
  }, [user?.saved_topics]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !token) return;

    setIsLoading(true);
    try {
      const result = await authClient.saveTopic(newTopic.trim(), token);
      setTopics(result.topics);
      updateTopics(result.topics);
      setNewTopic("");
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to save topic:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTopic = async (topic: string) => {
    if (!token) return;

    setDeletingTopic(topic);
    try {
      const result = await authClient.removeTopic(topic, token);
      setTopics(result.topics);
      updateTopics(result.topics);
    } catch (error) {
      console.error("Failed to remove topic:", error);
    } finally {
      setDeletingTopic(null);
    }
  };

  const handleTopicClick = (topic: string) => {
    onTopicClick?.(topic);
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <motion.button
            key={topic}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTopicClick(topic)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-300 text-sm hover:bg-sky-500/30 transition-colors"
          >
            <Hash className="w-3 h-3" />
            <span>{topic}</span>
          </motion.button>
        ))}
        {topics.length === 0 && (
          <span className="text-white/40 text-sm">No saved topics yet</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Hash className="w-5 h-5 text-sky-400" />
          Saved Topics
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 text-sm hover:bg-sky-500/30 transition-colors"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Add Topic"}
        </motion.button>
      </div>

      {/* Add Topic Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddTopic}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Enter a topic (e.g., AI, Cricket, Space)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20 transition-all"
              autoFocus
            />
            <motion.button
              type="submit"
              disabled={!newTopic.trim() || isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save"
              )}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Topics List */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {topics.map((topic) => (
            <motion.div
              key={topic}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
              className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-sky-400/30 transition-colors"
            >
              <button
                onClick={() => handleTopicClick(topic)}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <Hash className="w-4 h-4 text-sky-400" />
                <span>{topic}</span>
              </button>
              <button
                onClick={() => handleRemoveTopic(topic)}
                disabled={deletingTopic === topic}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
              >
                {deletingTopic === topic ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {topics.length === 0 && !isAdding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-white/40"
        >
          <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No saved topics yet</p>
          <p className="text-sm mt-1">
            Save topics to get personalized news in your feed
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default TopicsManager;
