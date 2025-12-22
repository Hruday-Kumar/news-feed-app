"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink, Clock, Newspaper, Heart, Share2, Loader2 } from "lucide-react";
import type { NewsCard as NewsCardType } from "@/types/schema";
import { useAuthStore } from "@/store/useAuthStore";
import { authClient } from "@/services/api/authClient";

// =============================================================================
// TYPES
// =============================================================================

interface NewsCardProps {
  item: NewsCardType;
  isActive: boolean;
  index: number;
  total: number;
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const headlineVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

function NewsCardComponent({ item, isActive, index, total }: NewsCardProps) {
  const { user, token } = useAuthStore();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fallback image if none provided
  const imageUrl: string = item.image ?? "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop";
  
  // Parse summary into bullet points if it's a single string
  const summaryText: string = item.summary ?? "No summary available.";
  const summaryPoints = summaryText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
    .slice(0, 3);

  const handleFavorite = async () => {
    if (!token || isSaving) return;
    
    setIsSaving(true);
    try {
      if (isFavorited) {
        await authClient.removeFavorite(item.url, token);
        setIsFavorited(false);
      } else {
        await authClient.addFavorite(item, token);
        setIsFavorited(true);
      }
    } catch (error) {
      console.error("Failed to update favorite:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.summary || "",
          url: item.url,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(item.url);
    }
  };

  return (
    <article className="relative h-[100dvh] w-full flex-shrink-0 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={imageUrl}
          alt={item.title}
          fill
          priority={isActive}
          className="object-cover"
          sizes="100vw"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop";
          }}
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
      </div>

      {/* Top Metadata Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-5">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
              <Newspaper className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-medium text-white/90">{item.source}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10"
          >
            <Clock className="w-3.5 h-3.5 text-white/60" />
            <span className="text-xs text-white/70">{item.date}</span>
          </motion.div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-16 left-4 right-4 z-20">
        <div className="flex gap-1">
          {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
                i === index % 10
                  ? "bg-white"
                  : i < index % 10
                  ? "bg-white/50"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Content Area - Glassmorphism */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isActive ? "visible" : "hidden"}
          className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-2xl shadow-black/50"
        >
          {/* Headline */}
          <motion.h1
            variants={headlineVariants}
            className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-4 drop-shadow-lg"
          >
            {item.title}
          </motion.h1>

          {/* Summary Points - Animated List */}
          <motion.ul className="space-y-2 mb-5">
            {summaryPoints.map((point, i) => (
              <motion.li
                key={i}
                variants={itemVariants}
                className="flex items-start gap-2 text-sm text-white/85 leading-relaxed"
              >
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                <span>{point}</span>
              </motion.li>
            ))}
          </motion.ul>

          {/* Actions Row */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between gap-3"
          >
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Read Article</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="flex gap-2">
              {/* Favorite Button */}
              {user && (
                <button
                  type="button"
                  onClick={handleFavorite}
                  disabled={isSaving}
                  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                  className={`h-11 w-11 rounded-xl border backdrop-blur-sm flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                    isFavorited 
                      ? "bg-pink-500/20 border-pink-500/30 text-pink-400" 
                      : "bg-white/10 border-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Heart className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`} />
                  )}
                </button>
              )}
              
              {/* Share Button */}
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share"
                className="h-11 w-11 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Card Counter */}
          <div className="mt-3 text-center">
            <span className="text-xs text-white/40">
              {index + 1} / {total}
            </span>
          </div>
        </motion.div>
      </div>
    </article>
  );
}

export const NewsCard = memo(NewsCardComponent);
export default NewsCard;
