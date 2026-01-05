/**
 * React hooks for @withvlibe/base-sdk
 *
 * @example
 * ```tsx
 * import { VlibeBaseDatabase, VlibeBaseAuth } from '@withvlibe/base-sdk';
 * import { useCollection, useKV, useAuth } from '@withvlibe/base-sdk/react';
 *
 * // Initialize clients
 * const db = new VlibeBaseDatabase({
 *   projectId: process.env.NEXT_PUBLIC_VLIBE_PROJECT_ID!,
 *   databaseToken: process.env.NEXT_PUBLIC_VLIBE_DB_TOKEN!,
 * });
 *
 * const auth = new VlibeBaseAuth({
 *   appId: process.env.NEXT_PUBLIC_VLIBE_BASE_APP_ID!,
 *   appSecret: process.env.VLIBE_BASE_APP_SECRET!, // Server-side only
 * });
 *
 * // Use hooks in components
 * function TodoList() {
 *   const { data, loading, insert, remove } = useCollection(db, 'todos', {
 *     orderBy: 'created_at',
 *     orderDirection: 'desc',
 *     realtime: true,
 *   });
 *
 *   const { data: settings, set: setSettings } = useKV(db, 'settings');
 *
 *   const { user, login, logout } = useAuth(auth);
 *
 *   // ...
 * }
 * ```
 *
 * @packageDocumentation
 */

'use client';

// Export all hooks
export { useCollection } from './hooks/useCollection';
export { useKV } from './hooks/useKV';
export { useAuth } from './hooks/useAuth';
export { useProducts } from './hooks/useProducts';
export { useCart } from './hooks/useCart';
export { useOrders } from './hooks/useOrders';

// Re-export types for convenience
export type {
  UseCollectionReturn,
  UseCollectionOptions,
  UseKVReturn,
  UseAuthReturn,
  UsePaymentsReturn,
  BaseRecord,
  VlibeUser,
  Product,
  Order,
  CartItem,
  CartItemWithProduct,
  CreateProductInput,
  CreateOrderInput,
} from './types';

// E-commerce hook return types
export type { UseProductsReturn, UseProductsOptions } from './hooks/useProducts';
export type { UseCartReturn } from './hooks/useCart';
export type { UseOrdersReturn, UseOrdersOptions } from './hooks/useOrders';
