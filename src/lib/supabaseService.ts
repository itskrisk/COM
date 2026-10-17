import { supabase } from './supabaseClient';

// ============================================
// TYPES
// ============================================

export interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  roles: string[];
  avatar_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: string;
  business_name: string;
  type: string;
  status: string;
  logo_url?: string;
  cover_url?: string;
  description?: string;
  address?: string;
  mpesa_till?: string;
  operating_hours: Record<string, any>;
  branding: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface Rider {
  id: string;
  vehicle_type: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  status: string;
  is_online: boolean;
  rating: number;
  total_orders: number;
  created_at: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  stock_level: number;
  is_featured: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  merchant_id: string;
  name: string;
  priority: number;
}

export interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  rider_id?: string;
  status: string;
  total: number;
  delivery_fee: number;
  service_fee: number;
  delivery_address?: string;
  delivery_instructions?: string;
  wants_cutlery?: boolean;
  payment_method: string;
  payment_status: string;
  mpesa_code?: string;
  notes?: string;
  items: any[];
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: string;
  changed_by: string;
  note?: string;
  created_at: string;
}

export interface WalletEntry {
  id: string;
  user_id: string;
  order_id?: string;
  amount: number;
  transaction_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Complaint {
  id: string;
  order_id?: string;
  filed_by: string;
  against_id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  merchant_id: string;
  rating: number;
  comment?: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// AUTH SERVICE
// ============================================

export const authService = {
  async signUp(email: string, password: string, metadata: {
    full_name: string;
    phone?: string;
    role?: string;
    merchant_type?: string;
    business_name?: string;
    business_type?: string;
    vehicle_type?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_plate?: string;
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'https://muncheez.co.ke'}/auth/callback`,
        data: metadata
      }
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  },

  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'https://muncheez.co.ke'}/auth/reset-password`
    });
    return { data, error };
  },

  async updateUser(updates: { email?: string; password?: string; data?: any }) {
    const { data, error } = await supabase.auth.updateUser(updates);
    return { data, error };
  }
};

// ============================================
// PROFILE SERVICE
// ============================================

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  async getAllProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    return { data, error };
  }
};

// ============================================
// MERCHANT SERVICE
// ============================================

export const merchantService = {
  async getMerchant(userId: string) {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async updateMerchant(userId: string, updates: Partial<Merchant> & Record<string, any>) {
    const cleanUpdates: Record<string, any> = { ...updates };

    // Normalize operating_hours to jsonb
    if (typeof cleanUpdates.operating_hours === 'string') {
      cleanUpdates.operating_hours = { hours: cleanUpdates.operating_hours };
    }

    // Map bulk_limit to bulk_purchase_limit
    if (cleanUpdates.bulk_limit !== undefined && cleanUpdates.bulk_purchase_limit === undefined) {
      cleanUpdates.bulk_purchase_limit = Number(cleanUpdates.bulk_limit);
    }

    const { data, error } = await supabase
      .from('merchants')
      .update(cleanUpdates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  async getAllMerchants() {
    const { data, error } = await supabase
      .from('merchants')
      .select('*');
    return { data, error };
  },

  async getPendingMerchants() {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('status', 'PENDING');
    return { data, error };
  }
};

// ============================================
// RIDER SERVICE
// ============================================

export const riderService = {
  async getRider(userId: string) {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async updateRider(userId: string, updates: Partial<Rider>) {
    const { data, error } = await supabase
      .from('riders')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  async getAllRiders() {
    const { data, error } = await supabase
      .from('riders')
      .select('*');
    return { data, error };
  },

  async getPendingRiders() {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('status', 'PENDING');
    return { data, error };
  }
};

// ============================================
// PRODUCT SERVICE
// ============================================

export const productService = {
  async getProducts(merchantId?: string, includeUnavailable: boolean = false) {
    let query = supabase
      .from('products')
      .select('*, category:categories(*)');

    if (!includeUnavailable) {
      query = query.eq('is_available', true);
    }

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  async getProduct(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createProduct(product: Partial<Product> & Record<string, any>) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let categoryId: string | null | undefined = product.category_id;
    let categoryName = product.category || '';

    // If category_id was given as text name (e.g. 'Fruits & Vegetables'), separate it
    if (categoryId && !isUUID.test(categoryId)) {
      categoryName = categoryId;
      categoryId = null;
    }

    // If we have a category name and merchant_id, ensure category exists in categories table to get a valid UUID
    if (!categoryId && categoryName && product.merchant_id) {
      try {
        const { data: existingCat } = await supabase
          .from('categories')
          .select('id')
          .eq('merchant_id', product.merchant_id)
          .ilike('name', categoryName)
          .maybeSingle();

        if (existingCat?.id) {
          categoryId = existingCat.id;
        } else {
          const { data: newCat } = await supabase
            .from('categories')
            .insert({
              merchant_id: product.merchant_id,
              name: categoryName,
              is_active: true
            })
            .select('id')
            .maybeSingle();
          if (newCat?.id) categoryId = newCat.id;
        }
      } catch (catErr) {
        console.warn('[productService] Category resolve warning:', catErr);
      }
    }

    const payload: Record<string, any> = {
      merchant_id: product.merchant_id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price) || 0,
      image_url: product.image_url || null,
      is_available: product.is_available ?? true,
      stock_level: product.stock_level ?? 50,
      is_featured: Boolean(product.is_featured),
      sku: product.sku || null,
      unit: product.unit || 'unit',
      category_id: categoryId || null,
      category: categoryName || null,
      compare_price: product.compare_price ? Number(product.compare_price) : null,
      tags: categoryName ? [categoryName] : (product.tags || [])
    };

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select('*, category:categories(*)')
      .single();

    return { data, error };
  },

  async updateProduct(id: string, updates: Partial<Product> & Record<string, any>) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const cleanUpdates: Record<string, any> = { ...updates };

    // If category_id is a text name rather than a UUID, resolve it to a real UUID
    let categoryName: string | null = null;
    if (cleanUpdates.category_id && !isUUID.test(cleanUpdates.category_id)) {
      categoryName = cleanUpdates.category_id;
      if (!cleanUpdates.category) cleanUpdates.category = categoryName;
      delete cleanUpdates.category_id;
    } else if (!cleanUpdates.category_id && cleanUpdates.category && typeof cleanUpdates.category === 'string') {
      categoryName = cleanUpdates.category;
    }

    // Resolve categoryName -> UUID if we have a merchant_id context
    if (categoryName && cleanUpdates.merchant_id && !cleanUpdates.category_id) {
      try {
        const { data: existingCat } = await supabase
          .from('categories')
          .select('id')
          .eq('merchant_id', cleanUpdates.merchant_id)
          .ilike('name', categoryName)
          .maybeSingle();

        if (existingCat?.id) {
          cleanUpdates.category_id = existingCat.id;
        } else {
          const { data: newCat } = await supabase
            .from('categories')
            .insert({ merchant_id: cleanUpdates.merchant_id, name: categoryName, is_active: true })
            .select('id')
            .maybeSingle();
          if (newCat?.id) cleanUpdates.category_id = newCat.id;
        }
      } catch (catErr) {
        console.warn('[productService.updateProduct] Category resolve warning:', catErr);
      }
    }

    if (cleanUpdates.price !== undefined) cleanUpdates.price = Number(cleanUpdates.price);
    if (cleanUpdates.stock_level !== undefined) cleanUpdates.stock_level = Number(cleanUpdates.stock_level);
    if (cleanUpdates.compare_price !== undefined) {
      cleanUpdates.compare_price = cleanUpdates.compare_price ? Number(cleanUpdates.compare_price) : null;
    }

    const { data, error } = await supabase
      .from('products')
      .update(cleanUpdates)
      .eq('id', id)
      .select('*, category:categories(*)')
      .single();

    return { data, error };
  },

  async deleteProduct(id: string) {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    return { data, error };
  }
};

// ============================================
// CATEGORY SERVICE
// ============================================

export const categoryService = {
  async getCategories(merchantId?: string) {
    let query = supabase
      .from('categories')
      .select('*');

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async createCategory(category: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();
    return { data, error };
  }
};

// ============================================
// ORDER SERVICE
// ============================================

export const orderService = {
  async getOrders(customerId?: string, merchantId?: string, riderId?: string) {
    let query = supabase
      .from('orders')
      .select(`
        *,
        store:stores(id, name, address),
        customer:users!CustomerOrders_customerId_fkey(full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (customerId) query = query.eq('customer_id', customerId);
    if (merchantId) query = query.eq('merchant_id', merchantId);
    if (riderId) query = query.eq('rider_id', riderId);

    const { data, error } = await query;
    return { data, error };
  },

  async getOrder(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createOrder(order: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();
    return { data, error };
  },

  async updateOrderStatus(id: string, status: string, changedBy?: string, note?: string) {
    // Update order - database trigger enforces state machine
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (orderError) return { data: null, error: orderError };

    // History is auto-logged by database trigger
    // But we also insert explicitly to ensure changed_by is captured
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        status,
        changed_by: changedBy,
        note
      });

    if (historyError) {
      console.error('Failed to create status history:', historyError);
    }

    return { data: order, error: null };
  },

  // Check if a status transition is valid (client-side pre-check)
  async canTransitionOrder(currentStatus: string, newStatus: string): Promise<{ allowed: boolean; error?: string }> {
    const { data, error } = await supabase
      .rpc('can_transition_order', {
        p_current_status: currentStatus,
        p_new_status: newStatus
      });

    if (error) {
      return { allowed: false, error: error.message };
    }

    return { allowed: data };
  },

  async getOrderHistory(orderId: string) {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    return { data, error };
  }
};

// ============================================
// WALLET SERVICE
// ============================================

export const walletService = {
  async getEntries(userId: string) {
    const { data, error } = await supabase
      .from('wallet_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createEntry(entry: Partial<WalletEntry>) {
    const { data, error } = await supabase
      .from('wallet_ledger')
      .insert(entry)
      .select()
      .single();
    return { data, error };
  }
};

// ============================================
// COMPLAINT SERVICE
// ============================================

export const complaintService = {
  async getComplaints(userId?: string) {
    let query = supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`filed_by.eq.${userId},against_id.eq.${userId}`);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async createComplaint(complaint: Partial<Complaint>) {
    const { data, error } = await supabase
      .from('complaints')
      .insert(complaint)
      .select()
      .single();
    return { data, error };
  }
};

// ============================================
// PUBLIC STOREFRONT SERVICE
// ============================================

export const publicStoreService = {
  // Haversine formula for distance calculation
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  async getStores(options?: { lat?: number; lng?: number; radius?: number; category?: string; search?: string; featured?: boolean }) {
    const { lat, lng, radius = 10, category, search, featured } = options || {};

    // Query only approved AND published merchants (is_active: true)
    let query = supabase
      .from('merchants')
      .select('*')
      .eq('status', 'APPROVED')
      .eq('is_active', true);

    // Search by name or description
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter featured
    if (featured) {
      query = query.eq('is_featured', true);
    }

    const { data: merchants, error } = await query;

    if (error || !merchants) {
      return { data: [], error };
    }

    // Get products and categories for each merchant
    const stores = await Promise.all(
      merchants.map(async (merchant) => {
        // Get categories
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name, priority')
          .eq('merchant_id', merchant.id)
          .order('priority', { ascending: true });

        // Get products count
        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)
          .eq('is_available', true)
          .neq('stock_level', 0);

        // Get reviews
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('merchant_id', merchant.id)
          .eq('is_visible', true);

        const ratings = reviews?.map(r => r.rating) || [];
        const avgRating = ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : merchant.rating || 0;

        let distance: number | undefined;
        if (lat && lng && merchant.lat && merchant.lng) {
          distance = this.calculateDistance(lat, lng, merchant.lat, merchant.lng);
        }

        return {
          ...merchant,
          categories: categories || [],
          productCount: productCount || 0,
          rating: avgRating,
          reviewCount: ratings.length,
          distance
        };
      })
    );

    // Filter by geolocation
    let filteredStores = stores;
    if (lat && lng) {
      filteredStores = stores.filter(store => {
        if (store.distance === undefined) return false;
        return store.distance <= radius!;
      });
    }

    // Filter by category
    if (category) {
      filteredStores = filteredStores.filter(store =>
        store.categories.some((cat: any) => cat.id === category || cat.name.toLowerCase().includes(category.toLowerCase()))
      );
    }

    return { data: filteredStores, error: null };
  },

  async getStore(id: string) {
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', id)
      .eq('status', 'APPROVED')
      .eq('is_active', true)
      .single();

    if (error || !merchant) {
      return { data: null, error: error?.message || 'Store not found or unpublished' };
    }

    // Get categories with products
    const { data: categories } = await supabase
      .from('categories')
      .select('*, products(*)')
      .eq('merchant_id', id)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    // Get reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, customer:profiles!customer_id(full_name)')
      .eq('merchant_id', id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(10);

    const ratings = reviews?.map(r => r.rating) || [];
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : merchant.rating || 0;

    return {
      data: {
        ...merchant,
        categories: categories || [],
        reviews: reviews || [],
        rating: avgRating,
        reviewCount: ratings.length
      },
      error: null
    };
  },

  async getStoreProducts(merchantId: string, options?: { category?: string; search?: string; featured?: boolean }) {
    const { category, search, featured } = options || {};

    // Verify merchant is approved and published
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, status, is_active')
      .eq('id', merchantId)
      .eq('status', 'APPROVED')
      .eq('is_active', true)
      .maybeSingle();

    if (merchantError || !merchant) {
      return { data: null, error: 'Store not found or not published' };
    }

    let query = supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('merchant_id', merchantId);
    // Note: we fetch ALL products (incl. out-of-stock/unavailable) so SupermarketStore
    // can render them with OUT OF STOCK / UNAVAILABLE overlays instead of hiding them.

    // Filter by category (handles both UUIDs and category text names)
    if (category && category !== 'All' && category !== 'General') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (isUUID.test(category)) {
        query = query.eq('category_id', category);
      } else {
        query = query.or(`category.ilike.%${category}%,tags.cs.{${category}}`);
      }
    }

    // Search
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter featured
    if (featured) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    return { data: data || [], error: error?.message || null };
  },

  async getCategories(merchantId?: string) {
    let query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }

    const { data, error } = await query.order('priority', { ascending: true });

    return { data: data || [], error: error?.message || null };
  },

  async search(query: string, options?: { lat?: number; lng?: number; radius?: number }) {
    const { lat, lng, radius = 10 } = options || {};
    const searchLower = query.toLowerCase();

    // Search merchants
    const { data: merchants, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('status', 'APPROVED')
      .eq('is_active', true)
      .or(`business_name.ilike.%${searchLower}%,description.ilike.%${searchLower}%`);

    if (merchantError) {
      return { data: { stores: [], products: [] }, error: merchantError.message };
    }

    // Filter by geolocation
    let stores = merchants || [];
    if (lat && lng) {
      stores = stores.filter(merchant => {
        if (!merchant.lat || !merchant.lng) return false;
        const distance = this.calculateDistance(lat, lng, merchant.lat, merchant.lng);
        merchant.distance = Math.round(distance * 100) / 100;
        return distance <= radius!;
      });
    }

    // Search products
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*, store:merchants(*)')
      .eq('is_available', true)
      .neq('stock_level', 0)
      .or(`name.ilike.%${searchLower}%,description.ilike.%${searchLower}%`);

    if (productError) {
      return { data: { stores, products: [] }, error: productError.message };
    }

    // Filter products by geolocation
    let filteredProducts = products || [];
    if (lat && lng) {
      filteredProducts = filteredProducts.filter(product => {
        if (!product.store?.lat || !product.store?.lng) return false;
        const distance = this.calculateDistance(lat, lng, product.store.lat, product.store.lng);
        product.distance = Math.round(distance * 100) / 100;
        return distance <= radius!;
      });
    }

    return { data: { stores, products: filteredProducts }, error: null };
  }
};

// ============================================
// REVIEWS SERVICE
// ============================================

export const reviewService = {
  async getReviews(merchantId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, customer:profiles!customer_id(full_name)')
      .eq('merchant_id', merchantId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    return { data: data || [], error: error?.message || null };
  },

  async createReview(review: Partial<Review>) {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async updateReview(id: string, updates: Partial<Review>) {
    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error: error?.message || null };
  }
};

// ============================================
// FINANCIAL LEDGER SERVICE
// ============================================

export interface FinancialEntry {
  id: string;
  order_id?: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  provider?: string;
  provider_reference?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const financialService = {
  async getEntries(userId: string, options?: { type?: string; status?: string; limit?: number }) {
    let query = supabase
      .from('financial_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.type) query = query.eq('type', options.type);
    if (options?.status) query = query.eq('status', options.status);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    return { data: data || [], error: error?.message || null };
  },

  async getOrderEntries(orderId: string) {
    const { data, error } = await supabase
      .from('financial_ledger')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    return { data: data || [], error: error?.message || null };
  },

  async createEntry(entry: Partial<FinancialEntry>) {
    const { data, error } = await supabase
      .from('financial_ledger')
      .insert(entry)
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async updateEntryStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('financial_ledger')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error: error?.message || null };
  }
};

// ============================================
// NOTIFICATION SERVICE
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  is_read: boolean;
  channel: string;
  created_at: string;
}

export const notificationService = {
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error: error?.message || null };
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return { count: count || 0, error: error?.message || null };
  },

  async markAsRead(id: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async markAllAsRead(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    return { data: data || [], error: error?.message || null };
  },

  async createNotification(notification: Partial<Notification>) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();
  }
};

// ============================================
// DISPATCH SERVICE
// ============================================

export interface DispatchOffer {
  id: string;
  order_id: string;
  rider_id: string;
  status: string;
  offered_at: string;
  responded_at?: string;
  expires_at: string;
  metadata: Record<string, any>;
  created_at: string;
}

export const dispatchService = {
  async createOffer(orderId: string, riderId: string, metadata?: Record<string, any>) {
    const { data, error } = await supabase
      .from('dispatch_offers')
      .insert({
        order_id: orderId,
        rider_id: riderId,
        status: 'PENDING',
        metadata: metadata || {}
      })
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async getPendingOffers(riderId: string) {
    const { data, error } = await supabase
      .from('dispatch_offers')
      .select('*, order:orders(*)')
      .eq('rider_id', riderId)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .order('offered_at', { ascending: true });

    return { data: data || [], error: error?.message || null };
  },

  async respondToOffer(offerId: string, status: 'ACCEPTED' | 'REJECTED') {
    const { data, error } = await supabase
      .from('dispatch_offers')
      .update({
        status,
        responded_at: new Date().toISOString()
      })
      .eq('id', offerId)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async getOrderOffers(orderId: string) {
    const { data, error } = await supabase
      .from('dispatch_offers')
      .select('*, rider:riders(*)')
      .eq('order_id', orderId)
      .order('offered_at', { ascending: true });

    return { data: data || [], error: error?.message || null };
  },

  async cancelExpiredOffers() {
    const { data, error } = await supabase
      .from('dispatch_offers')
      .update({ status: 'EXPIRED' })
      .eq('status', 'PENDING')
      .lt('expires_at', new Date().toISOString())
      .select();

    return { data: data || [], error: error?.message || null };
  },

  subscribeToOffers(riderId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`dispatch:${riderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dispatch_offers',
        filter: `rider_id=eq.${riderId}`
      }, callback)
      .subscribe();
  }
};

// ============================================
// RIDER LOCATION SERVICE
// ============================================

export interface RiderLocation {
  id: string;
  rider_id: string;
  order_id?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  created_at: string;
}

export const riderLocationService = {
  async updateLocation(location: Partial<RiderLocation>) {
    const { data, error } = await supabase
      .from('rider_locations')
      .upsert({
        rider_id: location.rider_id,
        order_id: location.order_id,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async getLocation(riderId: string) {
    const { data, error } = await supabase
      .from('rider_locations')
      .select('*')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return { data, error: error?.message || null };
  },

  async getOrderLocations(orderId: string) {
    const { data, error } = await supabase
      .from('rider_locations')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    return { data: data || [], error: error?.message || null };
  },

  subscribeToRiderLocation(riderId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`rider:${riderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rider_locations',
        filter: `rider_id=eq.${riderId}`
      }, callback)
      .subscribe();
  },

  subscribeToOrderLocations(orderId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`order:${orderId}:locations`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rider_locations',
        filter: `order_id=eq.${orderId}`
      }, callback)
      .subscribe();
  }
};

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export const realtimeService = {
  subscribeToOrder(orderId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`order:${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, callback)
      .subscribe();
  },

  subscribeToOrders(callback: (payload: any) => void) {
    return supabase
      .channel('orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, callback)
      .subscribe();
  }
};

// ============================================
// CART SERVICE
// ============================================

export interface CartItemData {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  merchantId: string;
  isAvailable: boolean;
  description?: string;
  categoryId?: string;
  tags?: string[];
  preparationTimeMin?: number;
  stockLevel?: number;
  vatRate?: number;
}

export interface Cart {
  id?: string;
  user_id?: string;
  session_id?: string;
  items: CartItemData[];
  merchantId: string | null;
  created_at?: string;
  updated_at?: string;
}

export const cartService = {
  async getCart(): Promise<{ data: Cart | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error) {
      return { data: null, error };
    }

    return {
      data: {
        id: data.id,
        user_id: data.user_id,
        session_id: data.session_id,
        items: data.items || [],
        merchantId: data.merchant_id,
        created_at: data.created_at,
        updated_at: data.updated_at
      },
      error: null
    };
  },

  async updateCart(cart: Partial<Cart>): Promise<{ data: Cart | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Try to update existing cart
    const { data: existing } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    let data, error;
    if (existing) {
      ({ data, error } = await supabase
        .from('carts')
        .update({
          items: cart.items,
          merchant_id: cart.merchantId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('carts')
        .insert({
          user_id: user.id,
          items: cart.items,
          merchant_id: cart.merchantId,
          is_active: true
        })
        .select()
        .single());
    }

    if (error) {
      return { data: null, error };
    }

    return {
      data: {
        id: data.id,
        user_id: data.user_id,
        session_id: data.session_id,
        items: data.items || [],
        merchantId: data.merchant_id,
        created_at: data.created_at,
        updated_at: data.updated_at
      },
      error: null
    };
  },

  async clearCart(): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('carts')
      .update({ items: [], merchant_id: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_active', true);

    return { error };
  }
};
