import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Product } from '../types/schema';
import { cartApi } from '../lib/api';

export interface CartItem extends Product {
  quantity: number;
  options?: string[];
  image?: string;
}

interface CartContextData {
  items: CartItem[];
  merchantId: string | null;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  loading: boolean;
}

const CartContext = createContext<CartContextData | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  // Synchronously initialize from localStorage so state never starts empty and wipes stored items
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('muncheez_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [merchantId, setMerchantId] = useState<string | null>(() => {
    try {
      return (
        localStorage.getItem('muncheez_cart_merchantId') ||
        localStorage.getItem('activeMerchantId') ||
        null
      );
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load cart from Supabase when user logs in
  useEffect(() => {
    const loadCart = async () => {
      if (!user) {
        // Load from localStorage for anonymous users
        try {
          const saved = localStorage.getItem('muncheez_cart_items');
          const savedMerchant = localStorage.getItem('muncheez_cart_merchantId');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
          }
          if (savedMerchant) setMerchantId(savedMerchant);
        } catch (e) {
          console.error('Error reading localStorage cart:', e);
        }
        return;
      }

      setLoading(true);
      try {
        const cartResult = await cartApi.getCart();
        if (cartResult.data && cartResult.data.items && cartResult.data.items.length > 0) {
          // Map CartItemData to CartItem
          const mappedItems: CartItem[] = cartResult.data.items.map((item: any) => ({
            id: item.productId || item.id,
            merchantId: item.merchantId || item.merchant_id,
            name: item.name,
            description: item.description,
            price: Number(item.price) || 0,
            imageUrl: item.image || item.imageUrl,
            isAvailable: item.isAvailable ?? true,
            categoryId: item.categoryId,
            tags: item.tags,
            preparationTimeMin: item.preparationTimeMin,
            stockLevel: item.stockLevel,
            vatRate: item.vatRate,
            quantity: item.quantity || 1,
            options: item.options,
            image: item.image || item.imageUrl
          }));
          setItems(mappedItems);
          if (cartResult.data.merchantId) {
            setMerchantId(cartResult.data.merchantId);
          }
        } else {
          // No cart in Supabase, preserve existing localStorage
          const saved = localStorage.getItem('muncheez_cart_items');
          const savedMerchant = localStorage.getItem('muncheez_cart_merchantId');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
          }
          if (savedMerchant) setMerchantId(savedMerchant);
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [user]);

  // Save cart to Supabase when user is logged in and cart changes
  useEffect(() => {
    if (!user || loading) return;

    const saveCart = async () => {
      try {
        if (items.length === 0) {
          await cartApi.clearCart();
        } else {
          await cartApi.updateCart({
            items: items.map(item => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
              name: item.name,
              image: item.imageUrl || item.image,
              merchantId: item.merchantId,
            })),
            merchantId: merchantId,
          });
        }
      } catch (error) {
        console.error('Failed to save cart:', error);
      }
    };

    const timeout = setTimeout(saveCart, 500);
    return () => clearTimeout(timeout);
  }, [items, merchantId, user, loading]);

  // Persist to localStorage safely
  useEffect(() => {
    try {
      localStorage.setItem('muncheez_cart_items', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist cart items to localStorage:', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      if (merchantId) {
        localStorage.setItem('muncheez_cart_merchantId', merchantId);
      } else if (items.length === 0) {
        localStorage.removeItem('muncheez_cart_merchantId');
      }
    } catch (e) {
      console.error('Failed to persist cart merchantId to localStorage:', e);
    }
  }, [merchantId, items.length]);

  const addItem = (product: Product, quantity: number = 1) => {
    // Resolve merchant ID across camelCase and snake_case properties
    const resolvedMerchantId =
      product.merchantId ||
      (product as any).merchant_id ||
      merchantId ||
      localStorage.getItem('muncheez_cart_merchantId') ||
      localStorage.getItem('activeMerchantId') ||
      null;

    // Enforce single-merchant cart (Nairobi operational reality)
    if (merchantId && resolvedMerchantId && merchantId !== resolvedMerchantId) {
      if (window.confirm("Adding this item will clear your cart from the previous store. Proceed?")) {
        setItems([{ ...product, merchantId: resolvedMerchantId, quantity }]);
        setMerchantId(resolvedMerchantId);
        if (resolvedMerchantId) {
          localStorage.setItem('muncheez_cart_merchantId', resolvedMerchantId);
        }
      }
      return;
    }

    if (resolvedMerchantId) {
      setMerchantId(resolvedMerchantId);
      localStorage.setItem('muncheez_cart_merchantId', resolvedMerchantId);
    }

    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // Stock Check for Retail
        if (product.stockLevel && existing.quantity >= product.stockLevel) {
          alert(`Sorry, only ${product.stockLevel} units left in stock.`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, merchantId: resolvedMerchantId || undefined, quantity }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== productId) return item;
      const newQty = Math.max(0, item.quantity + delta);

      // Stock Check for Retail
      if (item.stockLevel && newQty > item.stockLevel) {
        alert(`Cannot exceed ${item.stockLevel} available units.`);
        return item;
      }
      return { ...item, quantity: newQty };
    }).filter(item => item.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setItems(prev => {
      const newItems = prev.filter(item => item.id !== productId);
      if (newItems.length === 0) setMerchantId(null);
      return newItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    setMerchantId(null);
    if (user) {
      cartApi.clearCart().catch(console.error);
    }
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      merchantId,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      itemCount,
      loading
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
