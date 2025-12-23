/**
 * VlibeBaseDatabase - Database client for Vlibe Base Apps
 *
 * Provides access to the Vlibe managed database for Base apps.
 * Supports CRUD operations, real-time subscriptions, and key-value storage.
 *
 * @example
 * ```typescript
 * import { VlibeBaseDatabase } from '@withvlibe/base-sdk';
 *
 * const db = new VlibeBaseDatabase({
 *   projectId: process.env.VLIBE_PROJECT_ID!,
 *   databaseToken: process.env.VLIBE_DB_TOKEN!,
 * });
 *
 * // CRUD operations
 * const doc = await db.insert('documents', { title: 'Hello', content: 'World' });
 * const docs = await db.query('documents');
 * await db.update('documents', doc.id, { title: 'Updated' });
 * await db.delete('documents', doc.id);
 *
 * // Key-value store
 * await db.setKV('settings', { theme: 'dark' });
 * const settings = await db.getKV('settings');
 * ```
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type {
  DatabaseConfig,
  TableSchema,
  TableInfo,
  QueryOptions,
  RealtimePayload,
  Subscription,
  BaseRecord,
} from './types';

const DEFAULT_BASE_URL = 'https://vlibe.app';
const DEFAULT_SUPABASE_URL = 'https://qoblysxhxtifxhgdlzgl.supabase.co';

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

export class VlibeBaseDatabase {
  private projectId: string;
  private databaseToken: string;
  private baseUrl: string;
  private supabaseUrl: string;
  private supabase: SupabaseClient | null = null;
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  /**
   * Create a new VlibeBaseDatabase instance
   *
   * @param config - Database configuration
   * @throws Error if projectId or databaseToken is missing
   */
  constructor(config: DatabaseConfig) {
    if (!config.projectId) {
      throw new Error('VlibeBaseDatabase: projectId is required');
    }
    if (!config.databaseToken) {
      throw new Error('VlibeBaseDatabase: databaseToken is required');
    }

    this.projectId = config.projectId;
    this.databaseToken = config.databaseToken;
    this.baseUrl = resolveBaseUrl(config.baseUrl);
    this.supabaseUrl = config.supabaseUrl || DEFAULT_SUPABASE_URL;
  }

  /**
   * Get the full table name with unique project prefix
   * Uses the unique timestamp portion of the project ID to avoid collisions
   */
  private getFullTableName(tableName: string): string {
    // Extract the unique timestamp portion (last part after the last dash)
    const parts = this.projectId.split('-');
    const lastPart = parts[parts.length - 1];

    // If the last part is numeric (timestamp), use it; otherwise fallback
    let prefix: string;
    if (/^\d+$/.test(lastPart) && lastPart.length >= 8) {
      prefix = lastPart.slice(0, 8);
    } else {
      prefix = this.projectId
        .replace(/^(vlibe-brief-|proj-|project-)/, '')
        .slice(0, 8)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    }

    return `proj_${prefix}_${tableName.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
  }

  /**
   * Initialize Supabase client for real-time subscriptions
   */
  private initSupabase(): void {
    if (this.supabase) return;
    this.supabase = createClient(this.supabaseUrl, this.databaseToken, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  /**
   * Make an authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/database/${this.projectId}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.databaseToken}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }

    return data;
  }

  // ============================================================================
  // Table Operations
  // ============================================================================

  /**
   * Create a new table
   */
  async createTable(name: string, schema: TableSchema): Promise<TableInfo> {
    const response = await this.apiRequest<{ success: boolean; data: TableInfo }>(
      '/tables',
      {
        method: 'POST',
        body: JSON.stringify({ name, schema }),
      }
    );
    return response.data;
  }

  /**
   * Get table information
   */
  async getTable(name: string): Promise<TableInfo | null> {
    try {
      const response = await this.apiRequest<{ success: boolean; data: TableInfo }>(
        `/tables/${name}`
      );
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * List all tables
   */
  async listTables(): Promise<TableInfo[]> {
    const response = await this.apiRequest<{ success: boolean; data: TableInfo[] }>(
      '/tables'
    );
    return response.data;
  }

  /**
   * Delete a table
   */
  async deleteTable(name: string): Promise<boolean> {
    await this.apiRequest(`/tables/${name}`, { method: 'DELETE' });
    return true;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Insert a document into a collection
   */
  async insert<T extends BaseRecord>(
    collection: string,
    data: Partial<T>
  ): Promise<T> {
    const response = await this.apiRequest<{ success: boolean; data: T }>(
      `/collections/${collection}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  /**
   * Query documents from a collection
   */
  async query<T extends BaseRecord>(
    collection: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    if (options.orderBy) params.set('orderBy', options.orderBy);
    if (options.orderDirection) params.set('orderDirection', options.orderDirection);
    if (options.where) params.set('where', JSON.stringify(options.where));

    const queryString = params.toString();
    const endpoint = `/collections/${collection}${queryString ? `?${queryString}` : ''}`;

    const response = await this.apiRequest<{ success: boolean; data: T[] }>(endpoint);
    return response.data;
  }

  /**
   * Get a single document by ID
   */
  async get<T extends BaseRecord>(
    collection: string,
    id: string
  ): Promise<T | null> {
    try {
      const response = await this.apiRequest<{ success: boolean; data: T }>(
        `/collections/${collection}/${id}`
      );
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Update a document
   */
  async update<T extends BaseRecord>(
    collection: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    const response = await this.apiRequest<{ success: boolean; data: T }>(
      `/collections/${collection}/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  /**
   * Delete a document
   */
  async delete(collection: string, id: string): Promise<boolean> {
    await this.apiRequest(`/collections/${collection}/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  /**
   * Count documents in a collection
   */
  async count(collection: string, where?: Record<string, unknown>): Promise<number> {
    const params = new URLSearchParams();
    if (where) params.set('where', JSON.stringify(where));

    const queryString = params.toString();
    const endpoint = `/collections/${collection}/count${queryString ? `?${queryString}` : ''}`;

    const response = await this.apiRequest<{ success: boolean; data: { count: number } }>(
      endpoint
    );
    return response.data.count;
  }

  // ============================================================================
  // Key-Value Store
  // ============================================================================

  /**
   * Set a key-value pair
   */
  async setKV<T = unknown>(key: string, value: T): Promise<void> {
    await this.apiRequest('/kv', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
  }

  /**
   * Get a value by key
   */
  async getKV<T = unknown>(key: string): Promise<T | null> {
    try {
      const response = await this.apiRequest<{ success: boolean; data: { value: T } }>(
        `/kv/${key}`
      );
      return response.data.value;
    } catch {
      return null;
    }
  }

  /**
   * Delete a key-value pair
   */
  async deleteKV(key: string): Promise<boolean> {
    await this.apiRequest(`/kv/${key}`, { method: 'DELETE' });
    return true;
  }

  // ============================================================================
  // Real-time Subscriptions
  // ============================================================================

  /**
   * Subscribe to real-time changes on a collection
   */
  subscribe<T extends BaseRecord>(
    collection: string,
    callback: (payload: RealtimePayload<T>) => void
  ): Subscription {
    this.initSupabase();

    const channelName = `base:${this.projectId}:${collection}`;
    const tableName = this.getFullTableName(collection);

    const channel = this.supabase!.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as T | null,
            old: payload.old as T | null,
            table: collection,
          });
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return {
      unsubscribe: () => {
        channel.unsubscribe();
        this.subscriptions.delete(channelName);
      },
    };
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    for (const channel of this.subscriptions.values()) {
      channel.unsubscribe();
    }
    this.subscriptions.clear();
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get the project ID
   */
  getProjectId(): string {
    return this.projectId;
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
