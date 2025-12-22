/**
 * @file src/services/api/authClient.ts
 * @description Authentication API client for the Briefly application.
 * Handles signup, login, logout, and user data fetching.
 * 
 * Features:
 * - Automatic retry on network errors
 * - Proper error handling with user-friendly messages
 * - Request timeout management
 */

import type { User, NewsCard } from "@/types/schema";

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_CONFIG = {
  // Use environment variable or fall back to local development
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 2,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  message: string;
  token: string;
  user: User;
}

export interface TopicsResult {
  topics: string[];
  message?: string;
}

export interface FavoritesResult {
  favorites: NewsCard[];
}

export interface PersonalizedFeedResult {
  results: NewsCard[];
  message?: string;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch")) {
      return "Unable to connect to server. Please check your internet connection.";
    }
    if (error.message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    return error.message;
  }
  return "An unexpected error occurred";
}

// =============================================================================
// AUTH API CLIENT
// =============================================================================

class AuthApiClient {
  private static instance: AuthApiClient;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  private constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeoutMs = API_CONFIG.TIMEOUT_MS;
    console.log(`[AuthClient] Using API URL: ${this.baseUrl}`);
  }

  public static getInstance(): AuthApiClient {
    if (!AuthApiClient.instance) {
      AuthApiClient.instance = new AuthApiClient();
    }
    return AuthApiClient.instance;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string | null,
    retries: number = API_CONFIG.RETRY_ATTEMPTS
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[AuthClient] ${options.method || "GET"} ${endpoint}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      // Parse response body
      let data: unknown;
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { detail: text || "Unknown error" };
      }

      // Handle errors
      if (!response.ok) {
        const errorData = data as { detail?: string };
        const message = errorData.detail || `Request failed with status ${response.status}`;
        
        console.error(`[AuthClient] Error ${response.status}:`, message);
        throw new ApiError(message, response.status);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("Request timed out", 408);
      }

      // Handle network errors with retry
      if (error instanceof TypeError && error.message.includes("fetch") && retries > 0) {
        console.log(`[AuthClient] Retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry<T>(endpoint, options, token, retries - 1);
      }

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      throw new ApiError(getErrorMessage(error), 0);
    }
  }

  // ---------------------------------------------------------------------------
  // AUTH METHODS
  // ---------------------------------------------------------------------------

  /**
   * Sign up a new user.
   */
  public async signUp(data: SignUpData): Promise<AuthResult> {
    return this.fetchWithRetry<AuthResult>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Login with email and password.
   */
  public async login(data: LoginData): Promise<AuthResult> {
    return this.fetchWithRetry<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Logout current session.
   */
  public async logout(token: string): Promise<void> {
    try {
      await this.fetchWithRetry<{ message: string }>(
        "/auth/logout",
        { method: "POST" },
        token
      );
    } catch {
      // Ignore logout errors - we'll clear local state anyway
    }
  }

  /**
   * Get current user profile.
   */
  public async getMe(token: string): Promise<{ user: User }> {
    return this.fetchWithRetry<{ user: User }>("/auth/me", {}, token);
  }

  // ---------------------------------------------------------------------------
  // TOPICS METHODS
  // ---------------------------------------------------------------------------

  /**
   * Get user's saved topics.
   */
  public async getTopics(token: string): Promise<TopicsResult> {
    return this.fetchWithRetry<TopicsResult>("/topics", {}, token);
  }

  /**
   * Save a topic.
   */
  public async saveTopic(topic: string, token: string): Promise<TopicsResult> {
    return this.fetchWithRetry<TopicsResult>(
      "/topics",
      {
        method: "POST",
        body: JSON.stringify({ topic }),
      },
      token
    );
  }

  /**
   * Remove a topic.
   */
  public async removeTopic(topic: string, token: string): Promise<TopicsResult> {
    return this.fetchWithRetry<TopicsResult>(
      `/topics/${encodeURIComponent(topic)}`,
      { method: "DELETE" },
      token
    );
  }

  // ---------------------------------------------------------------------------
  // FAVORITES METHODS
  // ---------------------------------------------------------------------------

  /**
   * Get user's favorite articles.
   */
  public async getFavorites(token: string): Promise<FavoritesResult> {
    return this.fetchWithRetry<FavoritesResult>("/favorites", {}, token);
  }

  /**
   * Add article to favorites.
   */
  public async addFavorite(article: NewsCard, token: string): Promise<{ message: string }> {
    return this.fetchWithRetry<{ message: string }>(
      "/favorites",
      {
        method: "POST",
        body: JSON.stringify(article),
      },
      token
    );
  }

  /**
   * Remove article from favorites.
   */
  public async removeFavorite(url: string, token: string): Promise<{ message: string }> {
    return this.fetchWithRetry<{ message: string }>(
      `/favorites?url=${encodeURIComponent(url)}`,
      { method: "DELETE" },
      token
    );
  }

  // ---------------------------------------------------------------------------
  // PERSONALIZED FEED
  // ---------------------------------------------------------------------------

  /**
   * Get personalized feed based on saved topics.
   */
  public async getPersonalizedFeed(token: string): Promise<PersonalizedFeedResult> {
    return this.fetchWithRetry<PersonalizedFeedResult>("/feed/personalized", {}, token);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const authClient = AuthApiClient.getInstance();
export { AuthApiClient, ApiError };
