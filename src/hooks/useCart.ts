import { useState, useEffect, useCallback } from 'react';
import type { VlibeBaseEcommerce } from '../VlibeBaseEcommerce';
import type { CartItem, Address, Order } from '../types';

export interface UseCartReturn {
  cart: CartItem[];
  itemCount: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addItem: (item: CartItem) => Promise<CartItem[]>;
  updateItem: (productId: string, quantity: number) => Promise<CartItem[]>;
  removeItem: (productId: string) => Promise<CartItem[]>;
  clear: () => Promise<void>;
  checkout: (shippingAddress: Address, paymentMethodId?: string) => Promise<Order>;
  calculateTotal: () => Promise<any>;
}

/**
 * React hook for managing shopping cart
 *
 * @param ecommerce - VlibeBaseEcommerce instance
 * @param userId - User ID for cart ownership
 * @returns Shopping cart with add/update/remove/checkout operations
 *
 * @example
 * ```tsx
 * const { cart, itemCount, addItem, checkout } = useCart(ecommerce, userId);
 *
 * const handleAddToCart = async (productId: string) => {
 *   await addItem({ productId, quantity: 1 });
 * };
 *
 * const handleCheckout = async () => {
 *   const order = await checkout(shippingAddress, paymentMethodId);
 * };
 * ```
 */
export function useCart(ecommerce: VlibeBaseEcommerce, userId: string): UseCartReturn {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCart = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const items = await ecommerce.getCart(userId);
      setCart(items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load cart'));
    } finally {
      setLoading(false);
    }
  }, [ecommerce, userId]);

  // Load cart on mount
  useEffect(() => {
    if (userId) {
      loadCart();
    }
  }, [loadCart, userId]);

  const addItem = useCallback(async (item: CartItem): Promise<CartItem[]> => {
    const updated = await ecommerce.addToCart(userId, item);
    setCart(updated);
    return updated;
  }, [ecommerce, userId]);

  const updateItem = useCallback(async (productId: string, quantity: number): Promise<CartItem[]> => {
    const updated = await ecommerce.updateCartItem(userId, productId, quantity);
    setCart(updated);
    return updated;
  }, [ecommerce, userId]);

  const removeItem = useCallback(async (productId: string): Promise<CartItem[]> => {
    return updateItem(productId, 0);
  }, [updateItem]);

  const clear = useCallback(async (): Promise<void> => {
    await ecommerce.clearCart(userId);
    setCart([]);
  }, [ecommerce, userId]);

  const checkout = useCallback(async (shippingAddress: Address, paymentMethodId?: string): Promise<Order> => {
    const order = await ecommerce.checkout(userId, shippingAddress, paymentMethodId);
    setCart([]);
    return order;
  }, [ecommerce, userId]);

  const calculateTotal = useCallback(async () => {
    return ecommerce.calculateOrderTotal(cart);
  }, [ecommerce, cart]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart,
    itemCount,
    loading,
    error,
    refresh: loadCart,
    addItem,
    updateItem,
    removeItem,
    clear,
    checkout,
    calculateTotal,
  };
}
