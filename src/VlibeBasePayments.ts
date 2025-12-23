/**
 * VlibeBasePayments - Payment processing for Vlibe Base Apps
 *
 * Provides Stripe Connect payment processing with transaction fees.
 * Unlike Vlibe Official (50/50 revenue split), Base apps pay a small
 * transaction fee (0.5-2% depending on plan).
 *
 * @example
 * ```typescript
 * import { VlibeBasePayments } from '@withvlibe/base-sdk';
 *
 * const payments = new VlibeBasePayments({
 *   appId: process.env.VLIBE_BASE_APP_ID!,
 *   appSecret: process.env.VLIBE_BASE_APP_SECRET!,
 * });
 *
 * // Create a checkout session
 * const session = await payments.createCheckout({
 *   amount: 1999, // $19.99 in cents
 *   successUrl: '/success',
 *   cancelUrl: '/cancel',
 * });
 *
 * // Redirect user to session.url
 *
 * // Get transaction history
 * const transactions = await payments.getTransactions();
 * ```
 */

import type {
  PaymentsConfig,
  CheckoutOptions,
  CheckoutSession,
  Transaction,
  RefundOptions,
  ConnectStatus,
} from './types';

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

export class VlibeBasePayments {
  private appId: string;
  private appSecret: string;
  private baseUrl: string;

  /**
   * Create a new VlibeBasePayments instance
   *
   * @param config - Payments configuration
   * @throws Error if appId or appSecret is missing
   *
   * @remarks
   * This class should only be used server-side. Never expose your
   * appSecret to the client.
   */
  constructor(config: PaymentsConfig) {
    if (!config.appId) {
      throw new Error('VlibeBasePayments: appId is required');
    }
    if (!config.appSecret) {
      throw new Error('VlibeBasePayments: appSecret is required');
    }

    // Warn if used on client-side
    if (typeof window !== 'undefined') {
      console.warn(
        'VlibeBasePayments: This class should only be used server-side. ' +
          'Never expose your appSecret to the client.'
      );
    }

    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.baseUrl = resolveBaseUrl(config.baseUrl);
  }

  /**
   * Make an authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/base/payments${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': this.appId,
        'X-App-Secret': this.appSecret,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Payment API request failed');
    }

    return data;
  }

  // ============================================================================
  // Stripe Connect
  // ============================================================================

  /**
   * Get Stripe Connect onboarding URL
   *
   * Redirect users to this URL to connect their Stripe account.
   *
   * @param returnUrl - URL to return to after onboarding
   * @returns The Stripe Connect onboarding URL
   */
  async getConnectOnboardingUrl(returnUrl: string): Promise<string> {
    const response = await this.apiRequest<{ success: boolean; data: { url: string } }>(
      '/connect/onboard',
      {
        method: 'POST',
        body: JSON.stringify({ returnUrl }),
      }
    );
    return response.data.url;
  }

  /**
   * Check Stripe Connect status
   *
   * @returns The current Stripe Connect status
   */
  async getConnectStatus(): Promise<ConnectStatus> {
    const response = await this.apiRequest<{ success: boolean; data: ConnectStatus }>(
      '/connect/status'
    );
    return response.data;
  }

  // ============================================================================
  // Checkout
  // ============================================================================

  /**
   * Create a checkout session for one-time payments
   *
   * @param options - Checkout options
   * @returns The checkout session with URL to redirect user
   *
   * @remarks
   * Transaction fees are automatically calculated based on your plan:
   * - Free plan: 2% of transaction
   * - Premium plan: 0.5% of transaction
   */
  async createCheckout(options: CheckoutOptions): Promise<CheckoutSession> {
    const response = await this.apiRequest<{ success: boolean; data: CheckoutSession }>(
      '/checkout',
      {
        method: 'POST',
        body: JSON.stringify({
          amount: options.amount,
          currency: options.currency || 'usd',
          userId: options.userId,
          userEmail: options.userEmail,
          description: options.description,
          metadata: options.metadata,
          successUrl: options.successUrl,
          cancelUrl: options.cancelUrl,
        }),
      }
    );
    return response.data;
  }

  /**
   * Get checkout session by ID
   *
   * @param sessionId - The checkout session ID
   * @returns The checkout session details
   */
  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    try {
      const response = await this.apiRequest<{ success: boolean; data: CheckoutSession }>(
        `/checkout/${sessionId}`
      );
      return response.data;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Transactions
  // ============================================================================

  /**
   * Get all transactions
   *
   * @param options - Query options
   * @returns List of transactions
   */
  async getTransactions(options: {
    limit?: number;
    offset?: number;
    status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
  } = {}): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    if (options.status) params.set('status', options.status);

    const queryString = params.toString();
    const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;

    const response = await this.apiRequest<{ success: boolean; data: Transaction[] }>(
      endpoint
    );
    return response.data;
  }

  /**
   * Get a single transaction
   *
   * @param transactionId - The transaction ID
   * @returns The transaction details
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    try {
      const response = await this.apiRequest<{ success: boolean; data: Transaction }>(
        `/transactions/${transactionId}`
      );
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get transaction summary/stats
   *
   * @returns Transaction statistics
   */
  async getTransactionStats(): Promise<{
    totalRevenue: number;
    totalFees: number;
    netRevenue: number;
    transactionCount: number;
    thisMonth: {
      revenue: number;
      fees: number;
      net: number;
      count: number;
    };
  }> {
    const response = await this.apiRequest<{
      success: boolean;
      data: {
        totalRevenue: number;
        totalFees: number;
        netRevenue: number;
        transactionCount: number;
        thisMonth: {
          revenue: number;
          fees: number;
          net: number;
          count: number;
        };
      };
    }>('/transactions/stats');
    return response.data;
  }

  // ============================================================================
  // Refunds
  // ============================================================================

  /**
   * Create a refund
   *
   * @param options - Refund options
   * @returns The updated transaction
   *
   * @remarks
   * Note: Transaction fees are not refunded when you issue a refund.
   */
  async createRefund(options: RefundOptions): Promise<Transaction> {
    const response = await this.apiRequest<{ success: boolean; data: Transaction }>(
      '/refunds',
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
    return response.data;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Calculate the Vlibe fee for an amount
   *
   * @param amount - Amount in cents
   * @param plan - The Base plan ('free' or 'premium')
   * @returns The fee amount in cents
   */
  calculateFee(amount: number, plan: 'free' | 'premium' = 'free'): number {
    const feeRate = plan === 'premium' ? 0.005 : 0.02; // 0.5% or 2%
    return Math.round(amount * feeRate);
  }

  /**
   * Calculate net amount after fees
   *
   * @param amount - Gross amount in cents
   * @param plan - The Base plan ('free' or 'premium')
   * @returns The net amount in cents
   */
  calculateNetAmount(amount: number, plan: 'free' | 'premium' = 'free'): number {
    const fee = this.calculateFee(amount, plan);
    return amount - fee;
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
