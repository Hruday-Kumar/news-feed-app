"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Settings, X, ChevronRight, Heart, Hash } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { authClient } from "@/services/api/authClient";
import { TopicsManager } from "@/components/topics/TopicsManager";

// =============================================================================
// TYPES
// =============================================================================

interface UserPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTopicSearch: (topic: string) => void;
  onViewFavorites: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function UserPanel({ isOpen, onClose, onTopicSearch, onViewFavorites }: UserPanelProps) {
  const { user, token, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (token) {
        await authClient.logout(token);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      logout();
      setIsLoggingOut(false);
      onClose();
    }
  };

  const handleTopicClick = (topic: string) => {
    onTopicSearch(topic);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gray-900/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900/80 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <h2 className="font-semibold text-white">{user?.name}</h2>
                  <p className="text-sm text-white/50">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-sky-400 mb-1">
                    <Hash className="w-4 h-4" />
                    <span className="text-sm">Topics</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {user?.saved_topics?.length || 0}
                  </p>
                </div>
                <button
                  onClick={onViewFavorites}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-400/30 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2 text-pink-400 mb-1">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">Favorites</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-white">
                      {user?.favorites_count || 0}
                    </p>
                    <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                  </div>
                </button>
              </div>

              {/* Topics Manager */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <TopicsManager onTopicClick={handleTopicClick} />
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default UserPanel;
