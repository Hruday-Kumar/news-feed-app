/**
 * @file src/services/api/newsClient.ts
 * @description Data Access Layer for the Briefly application.
 * Handles all communication with the FastAPI backend.
 * 
 * CRITICAL: This module returns raw data only.
 * NO React hooks, state management, or UI components.
 */

import { z } from "zod";
import {
  FeedResponse,
  FeedResponseSchema,
  NewsCard,
  NewsCardSchema,
} from "@/types/schema";

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "https://news-feed-app-4o9x.onrender.com",
  TIMEOUT_MS: 60000, // 60 seconds (3 articles with AI summarization)
  RETRY_ATTEMPTS: 1, // Reduce retries to avoid long waits
} as const;

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

/**
 * Custom error class for API-related failures.
 */
export class NewsApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "NewsApiError";
    Object.setPrototypeOf(this, NewsApiError.prototype);
  }
}

/**
 * Custom error class for validation failures.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly zodError: z.ZodError
  ) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// =============================================================================
// NEWS API CLIENT
// =============================================================================

/**
 * Singleton client for interacting with the Briefly FastAPI backend.
 * Provides type-safe methods for fetching and searching news feeds.
 */
class NewsApiClient {
  private static instance: NewsApiClient;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  private constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeoutMs = API_CONFIG.TIMEOUT_MS;
  }

  /**
   * Get the singleton instance of NewsApiClient.
   */
  public static getInstance(): NewsApiClient {
    if (!NewsApiClient.instance) {
      NewsApiClient.instance = new NewsApiClient();
    }
    return NewsApiClient.instance;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Internal fetch wrapper with timeout and error handling.
   */
  private async fetchWithTimeout<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        throw new NewsApiError(
          `API request failed: ${response.statusText}`,
          response.status,
          endpoint,
          { body: errorBody }
        );
      }

      const data: unknown = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof NewsApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new NewsApiError(
          "Request timed out",
          408,
          endpoint,
          { timeoutMs: this.timeoutMs }
        );
      }

      throw new NewsApiError(
        error instanceof Error ? error.message : "Network error",
        0,
        endpoint,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Validate API response against Zod schema.
   */
  private validateResponse<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    endpoint: string
  ): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      console.error(
        `[NewsApiClient] Validation failed for ${endpoint}:`,
        result.error.format()
      );
      throw new ValidationError(
        `Invalid API response from ${endpoint}`,
        result.error
      );
    }

    return result.data;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API METHODS
  // ---------------------------------------------------------------------------

  /**
   * Fetch the default/trending news feed.
   * 
   * @param cursor - Optional pagination cursor for infinite scroll
   * @returns Promise<FeedResponse> - Validated feed response
   * 
   * @example
   * ```ts
   * const client = NewsApiClient.getInstance();
   * const feed = await client.getFeed();
   * console.log(feed.results); // NewsCard[]
   * ```
   */
  public async getFeed(cursor?: string): Promise<FeedResponse> {
    const params = new URLSearchParams();
    
    // Default query for trending/general news
    params.set("q", "trending OR breaking news");
    
    if (cursor) {
      params.set("cursor", cursor);
    }

    const endpoint = `/search?${params.toString()}`;
    const rawData = await this.fetchWithTimeout<unknown>(endpoint);

    return this.validateResponse(rawData, FeedResponseSchema, endpoint);
  }

  /**
   * Search for news articles by query.
   * 
   * @param query - Search query string (e.g., "AI technology", "climate change")
   * @param cursor - Optional pagination cursor for infinite scroll
   * @returns Promise<FeedResponse> - Validated feed response
   * 
   * @example
   * ```ts
   * const client = NewsApiClient.getInstance();
   * const results = await client.searchFeed("SpaceX launch");
   * console.log(results.results); // NewsCard[]
   * ```
   */
  public async searchFeed(query: string, cursor?: string): Promise<FeedResponse> {
    if (!query.trim()) {
      throw new NewsApiError(
        "Search query cannot be empty",
        400,
        "/search",
        { query }
      );
    }

    const params = new URLSearchParams();
    params.set("q", query.trim());
    
    if (cursor) {
      params.set("cursor", cursor);
    }

    const endpoint = `/search?${params.toString()}`;
    const rawData = await this.fetchWithTimeout<unknown>(endpoint);

    return this.validateResponse(rawData, FeedResponseSchema, endpoint);
  }

  /**
   * Fetch a single news card by URL (for deep linking/sharing).
   * 
   * @param articleUrl - The original article URL
   * @returns Promise<NewsCard | null> - The news card or null if not found
   */
  public async getArticle(articleUrl: string): Promise<NewsCard | null> {
    // Search for the specific article
    const feed = await this.searchFeed(articleUrl);
    
    const match = feed.results.find(
      (card) => card.url === articleUrl
    );

    return match ?? null;
  }

  /**
   * Health check for the backend API.
   * 
   * @returns Promise<boolean> - True if backend is reachable
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.fetchWithTimeout<unknown>("/search?q=test");
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Default singleton instance export.
 * Use this for most cases.
 */
export const newsClient = NewsApiClient.getInstance();

/**
 * Class export for testing or custom instantiation.
 */
export { NewsApiClient };

// =============================================================================
// CONVENIENCE FUNCTIONS (Functional API)
// =============================================================================

/**
 * Fetch the default news feed.
 * Convenience wrapper around newsClient.getFeed()
 */
export async function getFeed(cursor?: string): Promise<FeedResponse> {
  return newsClient.getFeed(cursor);
}

/**
 * Search for news by query.
 * Convenience wrapper around newsClient.searchFeed()
 */
export async function searchFeed(
  query: string,
  cursor?: string
): Promise<FeedResponse> {
  return newsClient.searchFeed(query, cursor);
}
