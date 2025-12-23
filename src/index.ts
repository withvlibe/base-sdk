/**
 * @withvlibe/base-sdk
 *
 * SDK for Vlibe Base Apps - provides authentication, database access,
 * and payment processing with transaction fees for websites, SaaS,
 * and e-commerce applications.
 *
 * @example
 * ```typescript
 * import { VlibeBaseDatabase, VlibeBaseAuth, VlibeBasePayments } from '@withvlibe/base-sdk';
 *
 * // Initialize database client
 * const db = new VlibeBaseDatabase({
 *   projectId: process.env.VLIBE_PROJECT_ID!,
 *   databaseToken: process.env.VLIBE_DB_TOKEN!,
 * });
 *
 * // Initialize auth client
 * const auth = new VlibeBaseAuth({
 *   appId: process.env.VLIBE_BASE_APP_ID!,
 *   appSecret: process.env.VLIBE_BASE_APP_SECRET!,
 * });
 *
 * // Initialize payments client (SERVER-SIDE ONLY)
 * const payments = new VlibeBasePayments({
 *   appId: process.env.VLIBE_BASE_APP_ID!,
 *   appSecret: process.env.VLIBE_BASE_APP_SECRET!,
 * });
 *
 * // CRUD operations
 * const doc = await db.insert('documents', { title: 'Hello' });
 * const docs = await db.query('documents');
 * await db.update('documents', doc.id, { title: 'Updated' });
 * await db.delete('documents', doc.id);
 *
 * // Key-value store
 * await db.setKV('settings', { theme: 'dark' });
 * const settings = await db.getKV('settings');
 *
 * // Payments (server-side only)
 * const session = await payments.createCheckout({
 *   amount: 1999, // $19.99 in cents
 *   successUrl: '/success',
 *   cancelUrl: '/cancel',
 * });
 * // Redirect user to session.url
 * ```
 *
 * @packageDocumentation
 */

// Core classes
export { VlibeBaseDatabase } from './VlibeBaseDatabase';
export { VlibeBaseAuth } from './VlibeBaseAuth';
export { VlibeBasePayments } from './VlibeBasePayments';

// All types
export type {
  // Configuration
  AppCategory,
  BasePlan,
  VlibeBaseConfig,
  DatabaseConfig,
  AuthConfig,
  PaymentsConfig,
  // Database types
  ColumnType,
  TableColumn,
  TableSchema,
  TableInfo,
  QueryOptions,
  BaseRecord,
  RealtimePayload,
  Subscription,
  // Auth types
  VlibeUser,
  VerifyResponse,
  AuthSession,
  // Payment types
  CheckoutOptions,
  CheckoutSession,
  Transaction,
  RefundOptions,
  ConnectStatus,
  // Category-specific types
  Page,
  Media,
  FeatureFlag,
  UsageMetric,
  Product,
  Order,
  OrderItem,
  Address,
  CartItem,
  // API types
  ApiResponse,
  PaginatedResponse,
  // Hook types (exported from main for convenience)
  UseCollectionReturn,
  UseCollectionOptions,
  UseKVReturn,
  UseAuthReturn,
  UsePaymentsReturn,
} from './types';
