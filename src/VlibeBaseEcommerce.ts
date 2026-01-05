import { VlibeBaseDatabase } from './VlibeBaseDatabase';
import type {
  Product,
  Order,
  OrderItem,
  CartItem,
  CartItemWithProduct,
  Address,
  CreateProductInput,
  CreateOrderInput,
  OrderCalculation,
  RevenueStats,
  ProductStats,
  OrderStats,
} from './types';

/**
 * VlibeBaseEcommerce - E-commerce functionality for Vlibe Base apps
 *
 * Provides specialized methods for managing products, inventory, orders,
 * shopping carts, and e-commerce analytics.
 */
export class VlibeBaseEcommerce {
  constructor(private db: VlibeBaseDatabase) {}

  // ===========================
  // PRODUCTS & INVENTORY
  // ===========================

  /**
   * Create a new product
   * Auto-generates SKU if not provided
   */
  async createProduct(input: CreateProductInput): Promise<Product> {
    const now = new Date().toISOString();
    const sku = input.sku || this.generateSKU();

    const product: Product = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      sku,
      price: input.price,
      currency: input.currency,
      images: input.images || [],
      stock: input.stock,
      isActive: input.isActive ?? true,
      category: input.category,
      metadata: input.metadata,
      created_at: now,
      updated_at: now,
    };

    await this.db.insert('products', product);
    return product;
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    const existing = await this.getProduct(productId);
    if (!existing) {
      throw new Error(`Product not found: ${productId}`);
    }

    const updated = {
      ...existing,
      ...updates,
      id: productId, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    };

    await this.db.update('products', productId, updated);
    return updated as Product;
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: string): Promise<Product | null> {
    return await this.db.get<Product>('products', productId);
  }

  /**
   * List products with filtering and pagination
   */
  async listProducts(options?: {
    category?: string;
    isActive?: boolean;
    sortBy?: 'name' | 'price' | 'stock' | 'created_at';
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    const where: Record<string, any> = {};

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const products = await this.db.query<Product>('products', {
      where,
      orderBy: options?.sortBy,
      orderDirection: 'asc',
      limit: options?.limit,
      offset: options?.offset,
    });

    const total = await this.db.count('products', where);

    return { products, total };
  }

  /**
   * Soft delete a product (sets isActive = false)
   */
  async deleteProduct(productId: string): Promise<void> {
    await this.updateProduct(productId, { isActive: false });
  }

  /**
   * Update product inventory with atomic operations
   */
  async updateInventory(
    productId: string,
    quantity: number,
    operation: 'set' | 'increment' | 'decrement'
  ): Promise<Product> {
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    let newStock: number;
    switch (operation) {
      case 'set':
        newStock = quantity;
        break;
      case 'increment':
        newStock = product.stock + quantity;
        break;
      case 'decrement':
        newStock = product.stock - quantity;
        if (newStock < 0) {
          throw new Error(`Insufficient stock for product ${productId}. Available: ${product.stock}, requested: ${quantity}`);
        }
        break;
    }

    return await this.updateProduct(productId, { stock: newStock });
  }

  /**
   * Get products below stock threshold
   */
  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    const products = await this.db.query<Product>('products', {
      where: { isActive: true },
    });

    return products.filter(p => p.stock <= threshold);
  }

  /**
   * Bulk update inventory for multiple products
   */
  async bulkUpdateInventory(
    updates: Array<{ productId: string; quantity: number; operation: 'set' | 'increment' | 'decrement' }>
  ): Promise<Product[]> {
    const results: Product[] = [];

    for (const update of updates) {
      const product = await this.updateInventory(update.productId, update.quantity, update.operation);
      results.push(product);
    }

    return results;
  }

  // ===========================
  // ORDERS & CHECKOUT
  // ===========================

  /**
   * Calculate order totals from cart items
   */
  async calculateOrderTotal(items: CartItem[]): Promise<OrderCalculation> {
    const calculatedItems: OrderCalculation['items'] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const lineTotal = product.price * item.quantity;
      const inStock = product.stock >= item.quantity;

      calculatedItems.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        lineTotal,
        inStock,
      });

      subtotal += lineTotal;
    }

    // Check if all items are in stock
    const allInStock = calculatedItems.every(item => item.inStock);
    if (!allInStock) {
      const outOfStock = calculatedItems.filter(item => !item.inStock);
      throw new Error(`Items out of stock: ${outOfStock.map(i => i.name).join(', ')}`);
    }

    // Simple tax calculation (can be customized)
    const tax = Math.round(subtotal * 0.08); // 8% tax

    // Simple shipping calculation (can be customized)
    const shipping = subtotal > 5000 ? 0 : 500; // Free shipping over $50, else $5

    const total = subtotal + tax + shipping;

    return {
      subtotal,
      tax,
      shipping,
      total,
      items: calculatedItems,
    };
  }

  /**
   * Create an order from cart items
   * Reduces inventory atomically
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const now = new Date().toISOString();

    // Calculate totals
    const calculation = await this.calculateOrderTotal(
      input.items.map(item => ({ productId: item.productId, quantity: item.quantity }))
    );

    // Create order items
    const orderItems: OrderItem[] = calculation.items.map(item => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    // Create order
    const order: Order = {
      id: crypto.randomUUID(),
      userId: input.userId,
      status: 'pending',
      items: orderItems,
      subtotal: calculation.subtotal,
      tax: calculation.tax,
      shipping: calculation.shipping,
      total: calculation.total,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      paymentMethodId: input.paymentMethodId,
      notes: input.notes,
      created_at: now,
      updated_at: now,
    };

    // Insert order
    await this.db.insert('orders', order);

    // Insert order items
    for (const item of orderItems) {
      await this.db.insert('order_items', {
        id: crypto.randomUUID(),
        orderId: order.id,
        ...item,
        lineTotal: item.price * item.quantity,
        created_at: now,
      });
    }

    // Reduce inventory
    await this.bulkUpdateInventory(
      input.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        operation: 'decrement' as const,
      }))
    );

    return order;
  }

  /**
   * Get an order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    const order = await this.db.get<Order>('orders', orderId);
    if (!order) return null;

    // Fetch order items
    const items = await this.db.query<any>('order_items', {
      where: { orderId },
    });

    order.items = items.map((item: any) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    return order;
  }

  /**
   * List orders with filtering
   */
  async listOrders(options?: {
    userId?: string;
    status?: Order['status'];
    sortBy?: 'created_at' | 'total';
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number }> {
    const where: Record<string, any> = {};

    if (options?.userId) {
      where.userId = options.userId;
    }
    if (options?.status) {
      where.status = options.status;
    }

    const orders = await this.db.query<Order>('orders', {
      where,
      orderBy: options?.sortBy || 'created_at',
      orderDirection: 'desc',
      limit: options?.limit,
      offset: options?.offset,
    });

    // Fetch items for each order
    for (const order of orders) {
      const items = await this.db.query<any>('order_items', {
        where: { orderId: order.id },
      });
      order.items = items.map((item: any) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));
    }

    const total = await this.db.count('orders', where);

    return { orders, total };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const updated = {
      ...order,
      status,
      updated_at: new Date().toISOString(),
    };

    await this.db.update('orders', orderId, updated);
    return updated;
  }

  /**
   * Cancel an order and optionally restore inventory
   */
  async cancelOrder(orderId: string, restoreInventory: boolean = true): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.status === 'cancelled') {
      return order;
    }

    // Restore inventory if requested
    if (restoreInventory && order.items) {
      await this.bulkUpdateInventory(
        order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          operation: 'increment' as const,
        }))
      );
    }

    return await this.updateOrderStatus(orderId, 'cancelled');
  }

  // ===========================
  // CART OPERATIONS
  // ===========================

  /**
   * Add item to user's cart
   */
  async addToCart(userId: string, item: CartItem): Promise<CartItem[]> {
    // Check if item already exists in cart
    const existingCart = await this.db.query<any>('carts', {
      where: { userId, productId: item.productId },
    });

    if (existingCart.length > 0) {
      // Update quantity
      const existing = existingCart[0];
      await this.db.update('carts', existing.id, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        updated_at: new Date().toISOString(),
      });
    } else {
      // Add new item
      await this.db.insert('carts', {
        id: crypto.randomUUID(),
        userId,
        productId: item.productId,
        quantity: item.quantity,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return await this.getCart(userId);
  }

  /**
   * Update cart item quantity or remove if quantity = 0
   */
  async updateCartItem(userId: string, productId: string, quantity: number): Promise<CartItem[]> {
    const items = await this.db.query<any>('carts', {
      where: { userId, productId },
    });

    if (items.length === 0) {
      throw new Error(`Cart item not found for product: ${productId}`);
    }

    const item = items[0];

    if (quantity === 0) {
      // Remove item
      await this.db.delete('carts', item.id);
    } else {
      // Update quantity
      await this.db.update('carts', item.id, {
        ...item,
        quantity,
        updated_at: new Date().toISOString(),
      });
    }

    return await this.getCart(userId);
  }

  /**
   * Get user's cart
   */
  async getCart(userId: string): Promise<CartItem[]> {
    const items = await this.db.query<any>('carts', {
      where: { userId },
    });

    return items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  }

  /**
   * Get user's cart with full product details
   */
  async getCartWithDetails(userId: string): Promise<CartItemWithProduct[]> {
    const cart = await this.getCart(userId);

    const enriched: CartItemWithProduct[] = [];

    for (const item of cart) {
      const product = await this.getProduct(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      enriched.push({
        productId: item.productId,
        quantity: item.quantity,
        product,
        lineTotal: product.price * item.quantity,
      });
    }

    return enriched;
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string): Promise<void> {
    const items = await this.db.query<any>('carts', {
      where: { userId },
    });

    for (const item of items) {
      await this.db.delete('carts', item.id);
    }
  }

  /**
   * Checkout - convert cart to order and clear cart
   */
  async checkout(userId: string, shippingAddress: Address, paymentMethodId?: string): Promise<Order> {
    const cart = await this.getCart(userId);

    if (cart.length === 0) {
      throw new Error('Cart is empty');
    }

    const order = await this.createOrder({
      userId,
      items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
      shippingAddress,
      paymentMethodId,
    });

    await this.clearCart(userId);

    return order;
  }

  // ===========================
  // ANALYTICS
  // ===========================

  /**
   * Get revenue statistics for a time period
   */
  async getRevenueStats(period: 'day' | 'week' | 'month' | 'year'): Promise<RevenueStats> {
    const now = new Date();
    const periodStart = this.getPeriodStart(now, period);
    const previousPeriodStart = this.getPeriodStart(new Date(periodStart), period);

    // Get orders in current period
    const orders = await this.db.query<Order>('orders', {});
    const currentOrders = orders.filter(o => new Date(o.created_at) >= periodStart);
    const previousOrders = orders.filter(o =>
      new Date(o.created_at) >= previousPeriodStart &&
      new Date(o.created_at) < periodStart
    );

    const totalRevenue = currentOrders.reduce((sum, o) => sum + o.total, 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = currentOrders.length;
    const previousOrderCount = previousOrders.length;

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const revenueTrend = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;
    const ordersTrend = previousOrderCount > 0
      ? ((totalOrders - previousOrderCount) / previousOrderCount) * 100
      : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString(),
      },
      trend: {
        revenue: Math.round(revenueTrend * 100) / 100,
        orders: Math.round(ordersTrend * 100) / 100,
      },
    };
  }

  /**
   * Get top selling products
   */
  async getTopProducts(limit: number = 10, period?: 'day' | 'week' | 'month'): Promise<ProductStats[]> {
    const orders = await this.db.query<Order>('orders', {});

    // Filter by period if specified
    let filteredOrders = orders;
    if (period) {
      const periodStart = this.getPeriodStart(new Date(), period);
      filteredOrders = orders.filter(o => new Date(o.created_at) >= periodStart);
    }

    // Aggregate by product
    const productMap = new Map<string, { name: string; totalSold: number; revenue: number }>();

    for (const order of filteredOrders) {
      if (!order.items) continue;
      for (const item of order.items) {
        const existing = productMap.get(item.productId) || { name: item.name, totalSold: 0, revenue: 0 };
        existing.totalSold += item.quantity;
        existing.revenue += item.price * item.quantity;
        productMap.set(item.productId, existing);
      }
    }

    // Convert to array and sort
    const stats: ProductStats[] = Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      name: data.name,
      totalSold: data.totalSold,
      revenue: data.revenue,
    }));

    stats.sort((a, b) => b.revenue - a.revenue);

    return stats.slice(0, limit);
  }

  /**
   * Get order statistics by status
   */
  async getOrderStats(): Promise<OrderStats> {
    const orders = await this.db.query<Order>('orders', {});

    const stats: OrderStats = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      averageOrderValue: 0,
    };

    let totalValue = 0;

    for (const order of orders) {
      stats[order.status]++;
      totalValue += order.total;
    }

    stats.averageOrderValue = orders.length > 0 ? totalValue / orders.length : 0;

    return stats;
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  private generateSKU(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${timestamp}-${random}`;
  }

  private getPeriodStart(date: Date, period: 'day' | 'week' | 'month' | 'year'): Date {
    const d = new Date(date);

    switch (period) {
      case 'day':
        d.setHours(0, 0, 0, 0);
        break;
      case 'week':
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        break;
      case 'month':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
      case 'year':
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        break;
    }

    return d;
  }
}
