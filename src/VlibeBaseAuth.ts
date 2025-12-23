/**
 * VlibeBaseAuth - SSO Authentication for Vlibe Base Apps
 *
 * Provides single sign-on authentication for users logged into Vlibe.
 *
 * @example
 * ```typescript
 * import { VlibeBaseAuth } from '@withvlibe/base-sdk';
 *
 * const auth = new VlibeBaseAuth({
 *   appId: process.env.VLIBE_BASE_APP_ID!,
 *   appSecret: process.env.VLIBE_BASE_APP_SECRET!,
 * });
 *
 * // Verify a session token
 * const user = await auth.verifySession(token);
 *
 * // Get login URL for unauthenticated users
 * const loginUrl = auth.getLoginUrl('/dashboard');
 * ```
 */

import type { AuthConfig, VlibeUser, VerifyResponse } from './types';

const DEFAULT_BASE_URL = 'https://vlibe.app';

/**
 * Get the base URL from environment or config
 */
function resolveBaseUrl(configBaseUrl?: string): string {
  if (configBaseUrl) return configBaseUrl;
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VLIBE_BASE_URL) return process.env.VLIBE_BASE_URL;
    if (process.env.NEXT_PUBLIC_VLIBE_BASE_URL) return process.env.NEXT_PUBLIC_VLIBE_BASE_URL;
  }
  return DEFAULT_BASE_URL;
}

export class VlibeBaseAuth {
  private appId: string;
  private appSecret: string;
  private baseUrl: string;

  /**
   * Create a new VlibeBaseAuth instance
   *
   * @param config - Authentication configuration
   * @throws Error if appId or appSecret is missing
   */
  constructor(config: AuthConfig) {
    if (!config.appId) {
      throw new Error('VlibeBaseAuth: appId is required');
    }
    if (!config.appSecret) {
      throw new Error('VlibeBaseAuth: appSecret is required');
    }

    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.baseUrl = resolveBaseUrl(config.baseUrl);
  }

  /**
   * Verify a session token and get user information
   *
   * @param token - The session token from the SSO callback
   * @returns The user object if valid, null otherwise
   */
  async verifySession(token: string): Promise<VlibeUser | null> {
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/sso/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          appId: this.appId,
          appSecret: this.appSecret,
          appType: 'base', // Indicate this is a Base app
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as VerifyResponse;

      if (data.valid && data.user) {
        return data.user;
      }

      return null;
    } catch (error) {
      console.error('VlibeBaseAuth: Failed to verify session:', error);
      return null;
    }
  }

  /**
   * Generate the SSO login URL to redirect unauthenticated users
   *
   * @param redirectPath - The path to redirect to after login
   * @returns The full Vlibe SSO URL
   */
  getLoginUrl(redirectPath: string = '/'): string {
    const params = new URLSearchParams({
      app_id: this.appId,
      app_type: 'base',
      redirect: redirectPath,
    });
    return `${this.baseUrl}/api/auth/sso?${params.toString()}`;
  }

  /**
   * Generate the logout URL
   *
   * @param redirectPath - The path to redirect to after logout
   * @returns The logout URL
   */
  getLogoutUrl(redirectPath: string = '/'): string {
    const params = new URLSearchParams({
      app_id: this.appId,
      redirect: redirectPath,
    });
    return `${this.baseUrl}/api/auth/sso/logout?${params.toString()}`;
  }

  /**
   * Check if user has access to a specific feature
   *
   * @param user - The Vlibe user object
   * @param feature - The feature name to check
   * @returns True if user has access to the feature
   */
  hasFeature(user: VlibeUser | null, feature: string): boolean {
    if (!user) return false;

    // Platform subscribers have access to all features
    if (user.subscriptionType === 'platform') {
      return true;
    }

    // Check individual subscription features
    if (user.appAccess?.features) {
      return (
        user.appAccess.features.includes('*') ||
        user.appAccess.features.includes(feature)
      );
    }

    return false;
  }

  /**
   * Check if user has an active subscription
   *
   * @param user - The Vlibe user object
   * @returns True if user has any active subscription
   */
  hasSubscription(user: VlibeUser | null): boolean {
    return user?.subscriptionType !== null;
  }

  /**
   * Get the subscription tier for a user
   *
   * @param user - The Vlibe user object
   * @returns The tier name or null
   */
  getTier(user: VlibeUser | null): string | null {
    if (!user) return null;
    if (user.subscriptionType === 'platform') return 'platform';
    return user.appAccess?.tier || null;
  }

  /**
   * Get the app ID
   */
  getAppId(): string {
    return this.appId;
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
