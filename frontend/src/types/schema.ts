/**
 * @file src/types/schema.ts
 * @description Domain models and Zod schemas for the Briefly application.
 * Maps 1:1 with backend FastAPI response structure.
 */

import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Political bias classification for news sources.
 */
export enum BiasLabel {
  LEFT = "left",
  CENTER = "center",
  RIGHT = "right",
}

// =============================================================================
// ZOD SCHEMAS (Runtime Validation)
// =============================================================================

/**
 * Schema for a single news card in the vertical feed.
 * Matches the backend JSON response structure from /search endpoint.
 */
export const NewsCardSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  imageUrl: z.string().nullable().optional(),
  source: z.string().min(1),
  summary: z.array(z.string()),
  url: z.string(),
  publishedAt: z.string(),
  biasLabel: z.string().optional().default("Neutral"),
});

/**
 * Schema for the feed API response.
 * Backend returns array directly, not wrapped in object.
 */
export const FeedResponseSchema = z.array(NewsCardSchema);

/**
 * Schema for user preferences (for future personalization features).
 */
export const UserPreferencesSchema = z.object({
  preferred_categories: z.array(z.string()).default([]),
  blocked_sources: z.array(z.string()).default([]),
  bias_preference: z.nativeEnum(BiasLabel).optional(),
  summary_length: z.number().int().min(1).max(5).default(3),
});

// =============================================================================
// TYPESCRIPT INTERFACES (Inferred from Zod)
// =============================================================================

/**
 * Represents a single news card in the vertical feed.
 * Maps to backend response item structure.
 */
export type NewsCard = z.infer<typeof NewsCardSchema>;

/**
 * Response model for feed endpoints.
 * Supports cursor-based pagination for infinite scroll.
 */
export type FeedResponse = z.infer<typeof FeedResponseSchema>;

/**
 * User preferences for personalized feed.
 */
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// =============================================================================
// EXPLICIT INTERFACE DEFINITIONS (Alternative, for documentation)
// =============================================================================

/**
 * Explicit interface definition matching backend schema.
 * Use this for strict compile-time checking.
 */
export interface INewsCard {
  /** Unique ID (article URL) */
  id: string;
  /** Article headline */
  title: string;
  /** URL to the article image */
  imageUrl: string | null;
  /** Name of the news source */
  source: string;
  /** AI-generated summary as array */
  summary: string[];
  /** URL to the original article */
  url: string;
  /** Publication date */
  publishedAt: string;
  /** Bias label */
  biasLabel?: string;
}

export interface IFeedResponse {
  /** List of news cards */
  results: INewsCard[];
  /** Cursor for fetching next page (optional) */
  next_cursor?: string;
  /** Total available results (optional) */
  total_count?: number;
  /** Original search query if applicable (optional) */
  query?: string;
}

export interface IUserPreferences {
  /** Preferred news categories */
  preferred_categories: string[];
  /** Sources to exclude from feed */
  blocked_sources: string[];
  /** Preferred bias perspective */
  bias_preference?: BiasLabel;
  /** Preferred number of summary points (1-5) */
  summary_length: number;
}
