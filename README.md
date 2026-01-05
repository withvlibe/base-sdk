# @withvlibe/base-sdk

SDK for Vlibe Base Apps - build websites, SaaS applications, and e-commerce stores with authentication, database, and payments out of the box.

## Features

- **Authentication** - SSO with Vlibe accounts
- **Database** - Managed database with CRUD operations and real-time subscriptions
- **Payments** - Stripe Connect integration with transaction fees (not revenue split)
- **React Hooks** - Ready-to-use hooks for React/Next.js applications
- **TypeScript** - Full type safety

## Installation

```bash
npm install @withvlibe/base-sdk
# or
yarn add @withvlibe/base-sdk
# or
pnpm add @withvlibe/base-sdk
```

## Quick Start

### 1. Environment Setup

Add these environment variables to your `.env` file:

```env
# Vlibe Base App credentials
VLIBE_BASE_APP_ID=your_app_id
VLIBE_BASE_APP_SECRET=your_app_secret

# Database access
VLIBE_PROJECT_ID=your_project_id
VLIBE_DB_TOKEN=your_database_token

# Client-side variables (for Next.js)
NEXT_PUBLIC_VLIBE_PROJECT_ID=your_project_id
NEXT_PUBLIC_VLIBE_DB_TOKEN=your_database_token
NEXT_PUBLIC_VLIBE_BASE_APP_ID=your_app_id
```

### 2. Initialize Clients

```typescript
import { VlibeBaseDatabase, VlibeBaseAuth, VlibeBasePayments } from '@withvlibe/base-sdk';

// Database client (can be used client-side or server-side)
export const db = new VlibeBaseDatabase({
  projectId: process.env.VLIBE_PROJECT_ID!,
  databaseToken: process.env.VLIBE_DB_TOKEN!,
});

// Auth client
export const auth = new VlibeBaseAuth({
  appId: process.env.VLIBE_BASE_APP_ID!,
  appSecret: process.env.VLIBE_BASE_APP_SECRET!,
});

// Payments client (SERVER-SIDE ONLY)
export const payments = new VlibeBasePayments({
  appId: process.env.VLIBE_BASE_APP_ID!,
  appSecret: process.env.VLIBE_BASE_APP_SECRET!,
});
```

## Database

### CRUD Operations

```typescript
// Insert a document
const doc = await db.insert('todos', {
  title: 'Learn Vlibe Base',
  completed: false,
});

// Query documents
const todos = await db.query('todos', {
  where: { completed: false },
  orderBy: 'created_at',
  orderDirection: 'desc',
  limit: 10,
});

// Get a single document
const todo = await db.get('todos', 'document-id');

// Update a document
await db.update('todos', 'document-id', {
  completed: true,
});

// Delete a document
await db.delete('todos', 'document-id');

// Count documents
const count = await db.count('todos', { completed: false });
```

### Key-Value Store

```typescript
// Set a value
await db.setKV('user-settings', {
  theme: 'dark',
  notifications: true,
});

// Get a value
const settings = await db.getKV<{ theme: string; notifications: boolean }>('user-settings');

// Delete a value
await db.deleteKV('user-settings');
```

### Real-time Subscriptions

```typescript
// Subscribe to changes
const subscription = db.subscribe('todos', (payload) => {
  console.log('Change detected:', payload.eventType);
  console.log('New data:', payload.new);
  console.log('Old data:', payload.old);
});

// Unsubscribe when done
subscription.unsubscribe();

// Unsubscribe all
db.unsubscribeAll();
```

## Authentication

```typescript
// Verify a session token (from SSO callback)
const user = await auth.verifySession(token);

// Get login URL
const loginUrl = auth.getLoginUrl('/dashboard');

// Get logout URL
const logoutUrl = auth.getLogoutUrl('/');

// Check features/subscription
if (auth.hasFeature(user, 'premium-feature')) {
  // Show premium content
}

if (auth.hasSubscription(user)) {
  // User has active subscription
}
```

## Payments

Vlibe Base uses a transaction fee model:
- **Free plan**: 2% transaction fee
- **Premium plan**: 0.5% transaction fee

```typescript
// Create a checkout session
const session = await payments.createCheckout({
  amount: 1999, // $19.99 in cents
  currency: 'usd',
  userId: user.id,
  userEmail: user.email,
  description: 'Premium Subscription',
  successUrl: 'https://myapp.com/success',
  cancelUrl: 'https://myapp.com/cancel',
});

// Redirect user to checkout
window.location.href = session.url;

// Get transaction history
const transactions = await payments.getTransactions({
  limit: 20,
  status: 'succeeded',
});

// Get transaction stats
const stats = await payments.getTransactionStats();
console.log('Total revenue:', stats.totalRevenue);
console.log('This month:', stats.thisMonth.revenue);

// Create a refund
await payments.createRefund({
  transactionId: 'transaction-id',
  amount: 999, // Partial refund of $9.99
  reason: 'Customer requested',
});

// Calculate fees
const fee = payments.calculateFee(1999, 'free'); // 40 cents (2%)
const net = payments.calculateNetAmount(1999, 'free'); // 1959 cents
```

### Stripe Connect Setup

```typescript
// Get onboarding URL for users to connect their Stripe account
const onboardingUrl = await payments.getConnectOnboardingUrl(
  'https://myapp.com/stripe/callback'
);

// Check Connect status
const status = await payments.getConnectStatus();
if (status.chargesEnabled && status.payoutsEnabled) {
  // Ready to accept payments
}
```

## React Hooks

```tsx
import { useCollection, useKV, useAuth } from '@withvlibe/base-sdk/react';

function TodoApp() {
  // Collection hook with real-time updates
  const { data: todos, loading, insert, update, remove } = useCollection(db, 'todos', {
    orderBy: 'created_at',
    orderDirection: 'desc',
    realtime: true,
  });

  // Key-value hook
  const { data: settings, set: setSettings } = useKV(db, 'user-settings');

  // Auth hook
  const { user, login, logout, hasFeature } = useAuth(auth);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <button onClick={() => login()}>Login with Vlibe</button>;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>

      {/* Theme toggle */}
      <button onClick={() => setSettings({ ...settings, theme: 'dark' })}>
        Dark Mode
      </button>

      {/* Todo list */}
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => update(todo.id, { completed: !todo.completed })}
            />
            {todo.title}
            <button onClick={() => remove(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      {/* Add todo */}
      <button onClick={() => insert({ title: 'New Todo', completed: false })}>
        Add Todo
      </button>

      {/* Premium feature */}
      {hasFeature('analytics') && <Analytics />}

      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

## Category-Specific Helpers

The SDK includes TypeScript types for common patterns:

### Website

```typescript
import type { Page, Media } from '@withvlibe/base-sdk';

const pages = await db.query<Page>('pages', { where: { isPublished: true } });
const media = await db.query<Media>('media');
```

### SaaS

```typescript
import type { FeatureFlag, UsageMetric } from '@withvlibe/base-sdk';

const flags = await db.query<FeatureFlag>('feature_flags');
const usage = await db.query<UsageMetric>('usage_metrics', {
  where: { userId: user.id },
});
```

### E-commerce

```typescript
import type { Product, Order, OrderItem } from '@withvlibe/base-sdk';

const products = await db.query<Product>('products', { where: { isActive: true } });
const orders = await db.query<Order>('orders', { where: { userId: user.id } });
```

## E-Commerce

The SDK provides specialized e-commerce functionality through `VlibeBaseEcommerce`.

### Setup

```typescript
import { VlibeBaseEcommerce } from '@withvlibe/base-sdk';

// Initialize with database client
export const ecommerce = new VlibeBaseEcommerce(db);
```

### Products

```typescript
// Create a product
const product = await ecommerce.createProduct({
  name: 'Premium T-Shirt',
  description: 'High-quality cotton t-shirt',
  price: 2999, // $29.99 in cents
  currency: 'usd',
  stock: 100,
  images: ['https://example.com/tshirt.jpg'],
  category: 'apparel',
  isActive: true,
});

// List products
const { products, total } = await ecommerce.listProducts({
  category: 'apparel',
  isActive: true,
  sortBy: 'created_at',
  limit: 20,
});

// Update inventory
await ecommerce.updateInventory(productId, 50, 'set');
await ecommerce.updateInventory(productId, 5, 'increment');
await ecommerce.updateInventory(productId, 3, 'decrement');

// Get low stock products
const lowStock = await ecommerce.getLowStockProducts(10); // threshold: 10
```

### Shopping Cart

```typescript
// Add to cart
await ecommerce.addToCart(userId, {
  productId: 'product-123',
  quantity: 2,
});

// Get cart (lightweight - only IDs and quantities)
const cart = await ecommerce.getCart(userId);
// Returns: [{ productId: '...', quantity: 2 }]

// Get cart with full product details
const detailedCart = await ecommerce.getCartWithDetails(userId);
// Returns: [{ productId: '...', quantity: 2, product: {...}, lineTotal: 5998 }]

// Update quantity
await ecommerce.updateCartItem(userId, productId, 5);

// Remove item (set quantity to 0)
await ecommerce.updateCartItem(userId, productId, 0);

// Calculate order totals
const calculation = await ecommerce.calculateOrderTotal(cart);
console.log('Subtotal:', calculation.subtotal);
console.log('Tax:', calculation.tax);
console.log('Shipping:', calculation.shipping);
console.log('Total:', calculation.total);

// Checkout (creates order and clears cart)
const order = await ecommerce.checkout(userId, {
  line1: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94102',
  country: 'US',
}, paymentMethodId);
```

### Orders

```typescript
// Create an order directly
const order = await ecommerce.createOrder({
  userId: 'user-123',
  items: [
    { productId: 'product-1', quantity: 2 },
    { productId: 'product-2', quantity: 1 },
  ],
  shippingAddress: {
    line1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
  },
});

// List orders
const { orders, total } = await ecommerce.listOrders({
  userId: 'user-123',
  status: 'pending',
  limit: 10,
});

// Update order status
await ecommerce.updateOrderStatus(orderId, 'shipped');

// Cancel order (optionally restore inventory)
await ecommerce.cancelOrder(orderId, true);
```

### Analytics

```typescript
// Revenue stats
const stats = await ecommerce.getRevenueStats('month');
console.log('Revenue:', stats.totalRevenue);
console.log('Orders:', stats.totalOrders);
console.log('AOV:', stats.averageOrderValue);
console.log('Trend:', stats.trend.revenue); // % change

// Top products
const topProducts = await ecommerce.getTopProducts(10, 'week');

// Order statistics
const orderStats = await ecommerce.getOrderStats();
console.log('Pending:', orderStats.pending);
console.log('Delivered:', orderStats.delivered);
```

### React Hooks for E-Commerce

```tsx
import { useProducts, useCart, useOrders } from '@withvlibe/base-sdk/react';

function ProductList() {
  const { products, loading, createProduct, updateProduct } = useProducts(ecommerce, {
    category: 'apparel',
    isActive: true,
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>${(product.price / 100).toFixed(2)}</p>
          <p>Stock: {product.stock}</p>
        </div>
      ))}
    </div>
  );
}

function ShoppingCart({ userId }: { userId: string }) {
  const { cart, itemCount, addItem, updateItem, removeItem, checkout, getCartWithDetails } = useCart(ecommerce, userId);
  const [detailedItems, setDetailedItems] = useState([]);

  useEffect(() => {
    // Load cart with product details
    const loadDetails = async () => {
      const items = await getCartWithDetails();
      setDetailedItems(items);
    };
    loadDetails();
  }, [getCartWithDetails]);

  return (
    <div>
      <h2>Cart ({itemCount} items)</h2>
      {detailedItems.map(item => (
        <div key={item.productId}>
          <h3>{item.product.name}</h3>
          <p>${(item.product.price / 100).toFixed(2)} x {item.quantity}</p>
          <p>Subtotal: ${(item.lineTotal / 100).toFixed(2)}</p>
          <button onClick={() => updateItem(item.productId, item.quantity + 1)}>+</button>
          <button onClick={() => updateItem(item.productId, item.quantity - 1)}>-</button>
          <button onClick={() => removeItem(item.productId)}>Remove</button>
        </div>
      ))}
      <button onClick={() => checkout(shippingAddress)}>Checkout</button>
    </div>
  );
}

function OrderHistory({ userId }: { userId: string }) {
  const { orders, loading, updateStatus, cancelOrder } = useOrders(ecommerce, { userId });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          <h3>Order #{order.id}</h3>
          <p>Status: {order.status}</p>
          <p>Total: ${(order.total / 100).toFixed(2)}</p>
          <ul>
            {order.items.map(item => (
              <li key={item.productId}>
                {item.name} x {item.quantity} - ${(item.price / 100).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

### Database Schema

Create these tables in your database:

```typescript
// Products table
interface ProductRow {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number; // cents
  currency: string;
  images: string[]; // JSON array
  stock: number;
  isActive: boolean;
  category?: string;
  metadata?: Record<string, any>; // JSON
  created_at: string;
  updated_at: string;
}

// Orders table
interface OrderRow {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[]; // JSON array
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: Address; // JSON
  billingAddress?: Address; // JSON
  paymentMethodId?: string;
  stripePaymentIntentId?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Order Items table (for queries)
interface OrderItemRow {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  lineTotal: number;
  created_at: string;
}

// Carts table
interface CartRow {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}
```

## API Reference

### VlibeBaseDatabase

| Method | Description |
|--------|-------------|
| `insert(collection, data)` | Insert a document |
| `query(collection, options?)` | Query documents |
| `get(collection, id)` | Get a document by ID |
| `update(collection, id, data)` | Update a document |
| `delete(collection, id)` | Delete a document |
| `count(collection, where?)` | Count documents |
| `setKV(key, value)` | Set a key-value pair |
| `getKV(key)` | Get a value by key |
| `deleteKV(key)` | Delete a key-value pair |
| `subscribe(collection, callback)` | Subscribe to real-time changes |
| `unsubscribeAll()` | Unsubscribe from all subscriptions |

### VlibeBaseAuth

| Method | Description |
|--------|-------------|
| `verifySession(token)` | Verify a session token |
| `getLoginUrl(redirectPath?)` | Get SSO login URL |
| `getLogoutUrl(redirectPath?)` | Get logout URL |
| `hasFeature(user, feature)` | Check if user has feature access |
| `hasSubscription(user)` | Check if user has subscription |
| `getTier(user)` | Get user's subscription tier |

### VlibeBasePayments

| Method | Description |
|--------|-------------|
| `createCheckout(options)` | Create a checkout session |
| `getCheckoutSession(id)` | Get checkout session details |
| `getTransactions(options?)` | Get transaction history |
| `getTransaction(id)` | Get a single transaction |
| `getTransactionStats()` | Get transaction statistics |
| `createRefund(options)` | Create a refund |
| `getConnectOnboardingUrl(returnUrl)` | Get Stripe Connect onboarding URL |
| `getConnectStatus()` | Get Stripe Connect status |
| `calculateFee(amount, plan)` | Calculate transaction fee |
| `calculateNetAmount(amount, plan)` | Calculate net amount after fees |

## Comparison with Vlibe Official SDK

| Feature | Base SDK | Official SDK |
|---------|----------|--------------|
| Auth | ✅ SSO | ✅ SSO |
| Database | ✅ Managed | ✅ Shared |
| Payments | ✅ Transaction fees (0.5-2%) | ✅ Revenue split (50/50) |
| Hosting | Self-hosted | Vlibe-hosted |
| Revenue | Keep 98-99.5% | Keep 50% |
| Best for | Independent apps | Vlibe ecosystem apps |

## License

MIT © [Vlibe](https://vlibe.app)
