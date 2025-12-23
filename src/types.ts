/**
 * Type definitions for @withvlibe/base-sdk
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * App category for Vlibe Base apps
 */
export type AppCategory = 'website' | 'saas' | 'ecommerce';

/**
 * Vlibe Base plan type
 */
export type BasePlan = 'free' | 'premium';

/**
 * Main configuration for Vlibe Base SDK
 */
export interface VlibeBaseConfig {
  appId: string;
  appSecret: string;
  baseUrl?: string;
  category?: AppCategory;
}

/**
 * Database client configuration
 */
export interface DatabaseConfig {
  projectId: string;
  databaseToken: string;
  baseUrl?: string;
  supabaseUrl?: string;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  appId: string;
  appSecret: string;
  baseUrl?: string;
}

/**
 * Payments configuration
 */
export interface PaymentsConfig {
  appId: string;
  appSecret: string;
  baseUrl?: string;
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Supported column types for table schemas
 */
export type ColumnType = 'string' | 'number' | 'boolean' | 'json' | 'datetime';

/**
 * Column definition for table creation
 */
export interface TableColumn {
  name: string;
  type: ColumnType;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
}

/**
 * Table schema for creation
 */
export interface TableSchema {
  columns: TableColumn[];
}

/**
 * Table information from the database
 */
export interface TableInfo {
  name: string;
  columns: TableColumn[];
  rowCount: number;
  createdAt: string;
}

/**
 * Query options for database operations
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: Record<string, unknown>;
}

/**
 * Base record type with common fields
 */
export interface BaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

/**
 * Real-time subscription payload
 */
export interface RealtimePayload<T = BaseRecord> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
  table: string;
}

/**
 * Subscription handle for cleanup
 */
export interface Subscription {
  unsubscribe: () => void;
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Vlibe user object returned from authentication
 */
export interface VlibeUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  subscriptionType: 'platform' | 'individual' | null;
  appAccess?: {
    tier: string | null;
    features: string[];
  } | null;
}

/**
 * Response from session verification
 */
export interface VerifyResponse {
  valid: boolean;
  user?: VlibeUser;
  error?: string;
}

/**
 * Authentication session
 */
export interface AuthSession {
  user: VlibeUser;
  token: string;
  expiresAt: string;
}

// ============================================================================
// Payment Types
// ============================================================================

/**
 * Options for creating a checkout session
 */
export interface CheckoutOptions {
  /** Amount in cents (e.g., 1999 for $19.99) */
  amount: number;
  /** Currency code (default: 'usd') */
  currency?: string;
  /** User ID to associate with the payment */
  userId?: string;
  /** User email for receipt */
  userEmail?: string;
  /** Description of the payment */
  description?: string;
  /** Metadata to attach to the payment */
  metadata?: Record<string, string>;
  /** URL to redirect on success */
  successUrl: string;
  /** URL to redirect on cancel */
  cancelUrl: string;
}

/**
 * Checkout session response
 */
export interface CheckoutSession {
  id: string;
  url: string;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  amount: number;
  vlibeFee: number;
  netAmount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  stripeId?: string;
  userId?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

/**
 * Refund options
 */
export interface RefundOptions {
  transactionId: string;
  amount?: number; // Partial refund amount in cents
  reason?: string;
}

/**
 * Stripe Connect status
 */
export interface ConnectStatus {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

// ============================================================================
// Category-Specific Types
// ============================================================================

// Website Category
export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  alt?: string;
  createdAt: string;
}

// SaaS Category
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  tier?: string;
  createdAt: string;
}

export interface UsageMetric {
  id: string;
  userId: string;
  metricType: string;
  value: number;
  period: string;
  createdAt: string;
}

// E-commerce Category
export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  currency: string;
  images: string[];
  stock: number;
  isActive: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  shippingAddress?: Address;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Standard API response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// React Hook Types
// ============================================================================

/**
 * Options for useCollection hook
 */
export interface UseCollectionOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: Record<string, unknown>;
  realtime?: boolean;
}

/**
 * Return type for useCollection hook
 */
export interface UseCollectionReturn<T = BaseRecord> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  insert: (doc: Partial<T>) => Promise<T | null>;
  update: (id: string, updates: Partial<T>) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
}

/**
 * Return type for useKV hook
 */
export interface UseKVReturn<T = unknown> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  set: (value: T) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Return type for useAuth hook
 */
export interface UseAuthReturn {
  user: VlibeUser | null;
  loading: boolean;
  error: Error | null;
  login: (redirectPath?: string) => void;
  logout: (redirectPath?: string) => void;
  hasFeature: (feature: string) => boolean;
  hasSubscription: () => boolean;
}

/**
 * Return type for usePayments hook
 */
export interface UsePaymentsReturn {
  loading: boolean;
  error: Error | null;
  createCheckout: (options: CheckoutOptions) => Promise<string | null>;
  transactions: Transaction[];
  loadTransactions: () => Promise<void>;
}
