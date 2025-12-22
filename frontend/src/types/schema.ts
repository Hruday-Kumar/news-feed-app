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
  title: z.string().min(1),
  image: z.string().nullable().optional(),
  source: z.string().min(1),
  summary: z.string().nullable().optional(),
  url: z.string(),
  date: z.string().nullable().optional(),
  topic: z.string().optional(),
});

/**
 * Schema for the feed API response.
 */
export const FeedResponseSchema = z.object({
  results: z.array(NewsCardSchema),
  message: z.string().optional(),
  total: z.number().optional(),
  page: z.number().optional(),
  has_more: z.boolean().optional(),
});

/**
 * Schema for user data.
 */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  saved_topics: z.array(z.string()).default([]),
  favorites_count: z.number().optional(),
});

/**
 * Schema for auth response.
 */
export const AuthResponseSchema = z.object({
  message: z.string(),
  token: z.string(),
  user: UserSchema,
});

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

/**
 * User data type.
 */
export type User = z.infer<typeof UserSchema>;

/**
 * Auth response type.
 */
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// =============================================================================
// EXPLICIT INTERFACE DEFINITIONS (Alternative, for documentation)
// =============================================================================

/**
 * Explicit interface definition matching backend schema.
 * Use this for strict compile-time checking.
 */
export interface INewsCard {
  /** Article headline */
  title: string;
  /** URL to the article image */
  image: string;
  /** Name of the news source */
  source: string;
  /** AI-generated summary */
  summary: string;
  /** URL to the original article */
  url: string;
  /** Publication date (YYYY-MM-DD) */
  date: string;
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
