import { useState, useEffect, useCallback } from 'react';
import type { VlibeBaseEcommerce } from '../VlibeBaseEcommerce';
import type { Product, CreateProductInput } from '../types';

export interface UseProductsOptions {
  category?: string;
  isActive?: boolean;
  autoLoad?: boolean;
}

export interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createProduct: (input: CreateProductInput) => Promise<Product>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
  updateInventory: (productId: string, quantity: number, operation: 'set' | 'increment' | 'decrement') => Promise<Product>;
}

/**
 * React hook for managing products
 *
 * @param ecommerce - VlibeBaseEcommerce instance
 * @param options - Optional filtering and configuration
 * @returns Product list with CRUD operations
 *
 * @example
 * ```tsx
 * const { products, loading, createProduct } = useProducts(ecommerce, { isActive: true });
 *
 * const handleCreate = async () => {
 *   await createProduct({
 *     name: 'T-Shirt',
 *     price: 2999,
 *     stock: 50,
 *     currency: 'usd'
 *   });
 * };
 * ```
 */
export function useProducts(
  ecommerce: VlibeBaseEcommerce,
  options?: UseProductsOptions
): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ecommerce.listProducts(options);
      setProducts(result.products);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load products'));
    } finally {
      setLoading(false);
    }
  }, [ecommerce, options?.category, options?.isActive]);

  // Load products on mount
  useEffect(() => {
    if (options?.autoLoad !== false) {
      loadProducts();
    }
  }, [loadProducts, options?.autoLoad]);

  const createProduct = useCallback(async (input: CreateProductInput): Promise<Product> => {
    const product = await ecommerce.createProduct(input);
    setProducts(prev => [product, ...prev]);
    return product;
  }, [ecommerce]);

  const updateProduct = useCallback(async (productId: string, updates: Partial<Product>): Promise<Product> => {
    const product = await ecommerce.updateProduct(productId, updates);
    setProducts(prev => prev.map(p => p.id === productId ? product : p));
    return product;
  }, [ecommerce]);

  const deleteProduct = useCallback(async (productId: string): Promise<void> => {
    await ecommerce.deleteProduct(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  }, [ecommerce]);

  const updateInventory = useCallback(async (
    productId: string,
    quantity: number,
    operation: 'set' | 'increment' | 'decrement'
  ): Promise<Product> => {
    const product = await ecommerce.updateInventory(productId, quantity, operation);
    setProducts(prev => prev.map(p => p.id === productId ? product : p));
    return product;
  }, [ecommerce]);

  return {
    products,
    loading,
    error,
    refresh: loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateInventory,
  };
}
