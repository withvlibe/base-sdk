import { useState, useEffect, useCallback } from 'react';
import type { VlibeBaseEcommerce } from '../VlibeBaseEcommerce';
import type { Order } from '../types';

export interface UseOrdersOptions {
  userId?: string;
  status?: Order['status'];
  autoLoad?: boolean;
}

export interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  updateStatus: (orderId: string, status: Order['status']) => Promise<Order>;
  cancelOrder: (orderId: string, restoreInventory?: boolean) => Promise<Order>;
}

/**
 * React hook for managing orders
 *
 * @param ecommerce - VlibeBaseEcommerce instance
 * @param options - Optional filtering and configuration
 * @returns Order list with status management operations
 *
 * @example
 * ```tsx
 * const { orders, loading, updateStatus } = useOrders(ecommerce, { userId: 'user123' });
 *
 * const handleShip = async (orderId: string) => {
 *   await updateStatus(orderId, 'shipped');
 * };
 * ```
 */
export function useOrders(
  ecommerce: VlibeBaseEcommerce,
  options?: UseOrdersOptions
): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ecommerce.listOrders(options);
      setOrders(result.orders);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, [ecommerce, options?.userId, options?.status]);

  // Load orders on mount
  useEffect(() => {
    if (options?.autoLoad !== false) {
      loadOrders();
    }
  }, [loadOrders, options?.autoLoad]);

  const updateStatus = useCallback(async (orderId: string, status: Order['status']): Promise<Order> => {
    const order = await ecommerce.updateOrderStatus(orderId, status);
    setOrders(prev => prev.map(o => o.id === orderId ? order : o));
    return order;
  }, [ecommerce]);

  const cancelOrder = useCallback(async (orderId: string, restoreInventory: boolean = true): Promise<Order> => {
    const order = await ecommerce.cancelOrder(orderId, restoreInventory);
    setOrders(prev => prev.map(o => o.id === orderId ? order : o));
    return order;
  }, [ecommerce]);

  return {
    orders,
    loading,
    error,
    refresh: loadOrders,
    updateStatus,
    cancelOrder,
  };
}
