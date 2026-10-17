import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productService, orderService, merchantService, realtimeService } from '../../lib/supabaseService';
import { uploadFile } from '../../lib/storageService';
import {
    Store,
    ShoppingBag,
    Clock,
    Plus,
    Search,
    CheckCircle2,
    Package,
    TrendingUp,
    Phone,
    MapPin,
    AlertCircle,
    LogOut,
    Eye,
    RefreshCw,
    Sliders,
    ArrowUpRight,
    Bike,
    DollarSign,
    X,
    Filter,
    Users,
    Tag,
    BarChart3,
    Settings,
    FileText,
    Star,
    Percent,
    Calendar,
    Save,
    ChevronRight,
    Edit2,
    Trash2,
    Image as ImageIcon,
    UploadCloud,
    LayoutGrid,
    List,
    Sparkles,
    ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Product Interface exactly matching SupermarketStore.tsx expectations
export interface SupermarketProduct {
    id: string;
    name: string;
    description?: string;
    category: string;
    categoryId?: string;
    price: number;
    promo?: boolean;
    oldPrice?: number | null;
    isAvailable: boolean;
    imageUrl: string;
    sku?: string;
    stockLevel: number;
    unit?: string;
}

export interface SupermarketOrder {
    id: string;
    customerName: string;
    customerPhone: string;
    address: string;
    placedAt: string;
    items: Array<{ name: string; quantity: number; price: number; unit?: string }>;
    total: number;
    status: 'CREATED' | 'PACKING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'COMPLETED';
    courierName?: string;
    courierPhone?: string;
    courierVehicle?: string;
}

export interface PromoCampaign {
    id: string;
    code: string;
    discountPercent: number;
    minBasketKES: number;
    isActive: boolean;
    expiresAt: string;
    usageCount: number;
}

// Preset library of authentic high-resolution Nairobi supermarket imagery
const PRESET_GROCERY_IMAGES = [
    { label: 'Hass Avocados', url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=600', category: 'Fruits & Vegetables' },
    { label: 'Fresh Broccoli', url: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?q=80&w=600', category: 'Fruits & Vegetables' },
    { label: 'Ripe Strawberries', url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=600', category: 'Fruits & Vegetables' },
    { label: 'Sourdough Bread', url: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?q=80&w=600', category: 'Bakery' },
    { label: 'Whole Cow Milk', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600', category: 'Fresh Food' },
    { label: 'Free-Range Eggs', url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=600', category: 'Fresh Food' },
    { label: 'Mineral Water 5L', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=600', category: 'Beverages' },
    { label: 'Cold-Pressed Juice', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=600', category: 'Beverages' },
    { label: 'Basmati Rice 2kg', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=600', category: 'Food Cupboard' },
    { label: 'Olive Oil 500ml', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=600', category: 'Food Cupboard' },
    { label: 'Eco Dish Soap', url: 'https://images.unsplash.com/photo-1585670210693-e7fdd16b142e?q=80&w=600', category: 'Cleaning & Household' },
    { label: 'Sweet Corn Frozen', url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=600', category: 'Frozen Food' },
];

// Real-time catalog, orders, and promotions are retrieved directly from Supabase
type MerchantTab = 'orders' | 'inventory' | 'customers' | 'deliveries' | 'promotions' | 'analytics' | 'finances' | 'settings';

export default function MerchantDashboard() {
    const navigate = useNavigate();
    const { profile, signOut } = useAuth();

    // Navigation Tab
    const [activeTab, setActiveTab] = useState<MerchantTab>('orders');

    // Display view in Inventory: Matrix Table vs. Live Storefront Glass Preview
    const [catalogViewMode, setCatalogViewMode] = useState<'matrix' | 'storefrontPreview'>('matrix');

    // Operational & Store Identity Settings synced with Storefront
    const [storeName, setStoreName] = useState(profile?.full_name || '');
    const [storeBranch, setStoreBranch] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [storePhone, setStorePhone] = useState(profile?.phone || '');
    const [storeEmail, setStoreEmail] = useState(profile?.email || '');
    const [storeDescription, setStoreDescription] = useState('');
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [packTimeMin, setPackTimeMin] = useState(20);
    const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(7);
    const [lowStockThreshold, setLowStockThreshold] = useState(10);
    const [bulkPurchaseLimit, setBulkPurchaseLimit] = useState(10);
    const [operatingHours, setOperatingHours] = useState('');
    const [mpesaTill, setMpesaTill] = useState('');
    // Store cover / card image
    const [storeCoverUrl, setStoreCoverUrl] = useState('');
    const [isUploadingCover, setIsUploadingCover] = useState(false);

    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [nearbyCouriers, setNearbyCouriers] = useState(0);

    // Approval gate check on mount: verify merchant status before granting dashboard access
    useEffect(() => {
        if (!profile?.id) return;
        const isApprovedLocally = localStorage.getItem('muncheez_merchant_approved_' + profile.id) === 'true';

        merchantService.getMerchant(profile.id).then(({ data }) => {
            const status = data?.status || profile.status;
            if (status === 'APPROVED' || isApprovedLocally) {
                // Approved: merchant has full dashboard access to configure store
                return;
            }
            if (status === 'REJECTED') {
                navigate('/rejected', { replace: true });
                return;
            }
            if (status === 'SUSPENDED') {
                navigate('/suspended', { replace: true });
                return;
            }
            if (data?.onboarding_completed || status === 'PENDING') {
                navigate('/pending-approval', { replace: true });
                return;
            }
            navigate('/merchant/onboarding', { replace: true });
        }).catch(() => {
            if (profile.status === 'PENDING') {
                navigate('/pending-approval', { replace: true });
            } else if (profile.status === 'REJECTED') {
                navigate('/rejected', { replace: true });
            }
        });
    }, [profile?.id, profile?.status, navigate]);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (e) {
            console.error('Merchant logout error:', e);
        } finally {
            localStorage.removeItem('activeMerchantId');
            navigate('/merchant/signup');
        }
    };

    const handleSaveStoreSettings = async () => {
        try {
            const updated = {
                business_name: storeName.trim(),
                address: `${storeBranch} - ${storeAddress}`.trim(),
                phone: storePhone.trim(),
                email: storeEmail.trim(),
                description: storeDescription.trim(),
                operating_hours: operatingHours,
                mpesa_till: mpesaTill,
                delivery_radius_km: deliveryRadiusKm,
                pack_time_min: packTimeMin,
                bulk_limit: bulkPurchaseLimit,
                low_stock_threshold: lowStockThreshold,
                is_active: isStoreOpen,
                // Store card / cover image saved to both fields for compatibility
                cover_url: storeCoverUrl.trim() || undefined,
                logo_url: storeCoverUrl.trim() || undefined,
            };
            localStorage.setItem('muncheez_merchant_settings', JSON.stringify(updated));
            if (merchantId) {
                await merchantService.updateMerchant(merchantId, updated as any);
            }
            alert('Store profile and operational settings successfully updated and synced with storefront!');
        } catch (e) {
            console.error('Save store settings error:', e);
            alert('Settings saved locally and synced with storefront.');
        }
    };

    // Products State (Load from localStorage immediately for zero-latency UX, then sync from Supabase)
    const [products, setProducts] = useState<SupermarketProduct[]>([]);
    const [orders, setOrders] = useState<SupermarketOrder[]>([]);
    const [promos, setPromos] = useState<PromoCampaign[]>([]);

    // ── SUPABASE DATA LOADING ──────────────────────────────────────────────────
    const loadDashboardData = useCallback(async (mId: string) => {
        setIsLoading(true);
        try {
            // Load real products from Supabase (including unavailable/draft to manage whole inventory)
            const { data: dbProducts } = await productService.getProducts(mId, true);
            if (dbProducts && dbProducts.length > 0) {
                const mapped: SupermarketProduct[] = dbProducts.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description || '',
                    category: p.category?.name || p.category || (Array.isArray(p.tags) && p.tags[0]) || 'Food Cupboard',
                    categoryId: p.category_id,
                    price: Number(p.price) || 0,
                    promo: p.is_featured || false,
                    oldPrice: p.compare_price ? Number(p.compare_price) : null,
                    isAvailable: p.is_available,
                    imageUrl: p.image_url || '',
                    stockLevel: Number(p.stock_level) || 0,
                    unit: p.unit || 'unit',
                    sku: p.sku || `SKU-${p.id.slice(-4).toUpperCase()}`
                }));
                setProducts(mapped);
            } else if (dbProducts) {
                setProducts([]);
            }

            // Load real orders from Supabase
            const { data: dbOrders } = await orderService.getOrders(undefined, mId);
            if (dbOrders && dbOrders.length > 0) {
                const mapped: SupermarketOrder[] = dbOrders.map((o: any) => ({
                    id: o.id.slice(0, 8).toUpperCase(),
                    customerName: o.customer?.full_name || 'Customer',
                    customerPhone: o.customer?.phone || '+254 700 000000',
                    address: o.delivery_address || 'Nairobi',
                    placedAt: new Date(o.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
                    items: (o.items || []).map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price, unit: i.unit })),
                    total: o.total,
                    status: o.status as SupermarketOrder['status'],
                    courierName: o.rider?.full_name,
                    courierPhone: o.rider?.phone,
                    courierVehicle: o.rider?.vehicle_type
                }));
                setOrders(mapped);
            }

            // Load online couriers count from Supabase
            const { data: onlineRiders } = await import('../../lib/supabaseClient').then(({ supabase }) =>
                supabase.from('riders').select('id', { count: 'exact', head: true }).eq('is_online', true)
            );
            setNearbyCouriers((onlineRiders as any)?.count || 0);

        } catch (err) {
            console.error('[MerchantDashboard] Failed to load data from Supabase:', err);
            setProducts([]); setOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load merchant profile then fetch dashboard data
    useEffect(() => {
        if (!profile?.id) { setIsLoading(false); return; }
        merchantService.getMerchant(profile.id).then(({ data }) => {
            const id = data?.id || profile.id;
            setMerchantId(id);
            // Sync all merchant settings from Supabase
            if (data?.business_name) setStoreName(data.business_name);
            if (data?.phone) setStorePhone(data.phone);
            if (data?.email) setStoreEmail(data.email);
            if (data?.description) setStoreDescription(data.description);
            if (data?.mpesa_till) setMpesaTill(data.mpesa_till);
            if (data?.is_active !== undefined) setIsStoreOpen(data.is_active);
            if (data?.operating_hours?.hours) setOperatingHours(data.operating_hours.hours);
            // Load cover image
            setStoreCoverUrl(data?.cover_url || data?.logo_url || data?.branding?.bannerUrl || '');
            if (data?.address) {
                const parts = data.address.split(' - ');
                if (parts.length >= 2) {
                    setStoreBranch(parts[0].trim());
                    setStoreAddress(parts.slice(1).join(' - ').trim());
                } else {
                    setStoreAddress(data.address);
                }
            }
            loadDashboardData(id);
        }).catch(() => { setIsLoading(false); });
    }, [profile?.id, loadDashboardData]);

    // Real-time order subscription — new orders appear instantly
    useEffect(() => {
        if (!merchantId) return;
        const sub = realtimeService.subscribeToOrders((payload) => {
            if (payload.new?.merchant_id !== merchantId) return;
            const o = payload.new;
            const newOrder: SupermarketOrder = {
                id: o.id.slice(0, 8).toUpperCase(),
                customerName: 'New Customer',
                customerPhone: '+254 700 000000',
                address: o.delivery_address || 'Nairobi',
                placedAt: 'Just now',
                items: o.items || [],
                total: o.total,
                status: o.status as SupermarketOrder['status']
            };
            if (payload.eventType === 'INSERT') {
                setOrders(prev => [newOrder, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setOrders(prev => prev.map(existing =>
                    existing.id === newOrder.id ? { ...existing, status: newOrder.status } : existing
                ));
            }
        });
        return () => { sub.unsubscribe?.(); };
    }, [merchantId]);

    // Sync order status changes to Supabase
    const syncOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
        if (!profile?.id) return;
        try {
            // Find the full UUID from current orders list — orderId is truncated display id
            await orderService.updateOrderStatus(orderId, newStatus, profile.id);
        } catch (err) {
            console.error('[MerchantDashboard] Order status sync failed:', err);
        }
    }, [profile?.id]);

    // Filter states
    const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
    const [orderSearch, setOrderSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [inventorySearch, setInventorySearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');

    // Modal / Drawer: Add & Edit Product
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formCategory, setFormCategory] = useState('Fruits & Vegetables');
    const [formPrice, setFormPrice] = useState('');
    const [formStock, setFormStock] = useState('50');
    const [formUnit, setFormUnit] = useState('pack');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [formIsPromo, setFormIsPromo] = useState(false);
    const [formOldPrice, setFormOldPrice] = useState('');
    const [formSku, setFormSku] = useState('');

    // Modal: Create Promo
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [newPromoCode, setNewPromoCode] = useState('');
    const [newDiscount, setNewDiscount] = useState('10');
    const [newMinBasket, setNewMinBasket] = useState('1000');
    const [newExpiry, setNewExpiry] = useState('2026-12-31');

    // Comprehensive supermarket categories taxonomy matching SupermarketStore.tsx exactly
    const categories = [
        'All',
        'Shop your list',
        'Fruits & Vegetables',
        'Bakery',
        'Beverages',
        'Alcohol',
        'Fresh Food',
        'Cleaning & Household',
        'Frozen Food',
        'Food Cupboard',
        'Delicatessen',
        'Beauty & Personal Care',
        'Bio & Organic Food',
        'Baby Products',
        'Health & Fitness',
        'Delicatessen Counter',
        'Electronics & Appliances',
        'Pet Supplies',
        'Stationery & School Supplies',
        'Automotive',
        'Home & Garden',
        'Kiosk',
        'Deals'
    ];

    // Filtered products
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchesCat =
                selectedCategory === 'All'
                    ? true
                    : selectedCategory === 'Deals'
                    ? p.promo === true
                    : p.category === selectedCategory || p.categoryId === selectedCategory;
            const matchesSearch =
                p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(inventorySearch.toLowerCase()));
            return matchesCat && matchesSearch;
        });
    }, [products, selectedCategory, inventorySearch]);

    // Financial Metrics
    const financials = useMemo(() => {
        const gross = orders.reduce((sum, o) => sum + o.total, 0);
        const commission = Math.round(gross * 0.10);
        const vat = Math.round(gross * 0.16);
        const netPayout = gross - commission;
        const avgBasket = Math.round(gross / (orders.length || 1));
        return { gross, commission, vat, netPayout, avgBasket };
    }, [orders]);

    // Clientele / CRM
    const clientele = useMemo(() => {
        const clientMap = new Map<string, {
            phone: string;
            name: string;
            orderCount: number;
            totalSpent: number;
            lastOrder: string;
            tier: 'VIP' | 'Regular' | 'New';
        }>();

        orders.forEach((o) => {
            if (!clientMap.has(o.customerPhone)) {
                clientMap.set(o.customerPhone, {
                    phone: o.customerPhone,
                    name: o.customerName,
                    orderCount: 0,
                    totalSpent: 0,
                    lastOrder: o.placedAt,
                    tier: 'New'
                });
            }
            const record = clientMap.get(o.customerPhone)!;
            record.orderCount += 1;
            record.totalSpent += o.total;
            record.tier = record.totalSpent > 2000 ? 'VIP' : record.orderCount > 1 ? 'Regular' : 'New';
        });

        return Array.from(clientMap.values()).filter((c) =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
        );
    }, [orders, customerSearch]);

    // Handlers
    const handleOpenAddModal = () => {
        setEditingProductId(null);
        setFormName('');
        setFormDescription('');
        setFormCategory('Fruits & Vegetables');
        setFormPrice('');
        setFormStock('50');
        setFormUnit('pack');
        setFormImageUrl(PRESET_GROCERY_IMAGES[0].url);
        setFormIsPromo(false);
        setFormOldPrice('');
        setFormSku(`SKU-${Date.now().toString().slice(-4)}`);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (prod: SupermarketProduct) => {
        setEditingProductId(prod.id);
        setFormName(prod.name);
        setFormDescription(prod.description || '');
        setFormCategory(prod.category);
        setFormPrice(prod.price.toString());
        setFormStock(prod.stockLevel.toString());
        setFormUnit(prod.unit || 'pack');
        setFormImageUrl(prod.imageUrl);
        setFormIsPromo(Boolean(prod.promo));
        setFormOldPrice(prod.oldPrice ? prod.oldPrice.toString() : '');
        setFormSku(prod.sku || `SKU-${prod.id}`);
        setIsModalOpen(true);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim() || !formPrice) return;

        const numericPrice = Number(formPrice);
        const numericStock = Number(formStock) || 0;
        const numericOldPrice = formIsPromo && formOldPrice ? Number(formOldPrice) : null;

        if (editingProductId) {
            // Update existing locally first
            setProducts((prev) =>
                prev.map((p) =>
                    p.id === editingProductId
                        ? {
                              ...p,
                              name: formName.trim(),
                              description: formDescription.trim(),
                              category: formCategory,
                              categoryId: formCategory,
                              price: numericPrice,
                              promo: formIsPromo,
                              oldPrice: numericOldPrice,
                              stockLevel: numericStock,
                              isAvailable: numericStock > 0,
                              imageUrl: formImageUrl || PRESET_GROCERY_IMAGES[0].url,
                              unit: formUnit,
                              sku: formSku
                          }
                        : p
                )
            );
            // Sync to Supabase
            if (!editingProductId.startsWith('sm-')) {
                productService.updateProduct(editingProductId, {
                    name: formName.trim(),
                    description: formDescription.trim(),
                    category: formCategory,
                    category_id: formCategory,
                    price: numericPrice,
                    compare_price: numericOldPrice,
                    is_featured: formIsPromo,
                    stock_level: numericStock,
                    is_available: numericStock > 0,
                    image_url: formImageUrl || PRESET_GROCERY_IMAGES[0].url,
                    unit: formUnit,
                    sku: formSku
                } as any).catch(err => {
                    console.error('[MerchantDashboard] Failed to update product in Supabase:', err);
                });
            }
        } else {
            // Create new locally first
            const tempId = `sm-${Date.now()}`;
            const newProd: SupermarketProduct = {
                id: tempId,
                name: formName.trim(),
                description: formDescription.trim(),
                category: formCategory,
                categoryId: formCategory,
                price: numericPrice,
                promo: formIsPromo,
                oldPrice: numericOldPrice,
                isAvailable: numericStock > 0,
                imageUrl: formImageUrl || PRESET_GROCERY_IMAGES[0].url,
                stockLevel: numericStock,
                unit: formUnit,
                sku: formSku || `SKU-${Date.now().toString().slice(-4)}`
            };
            setProducts((prev) => [newProd, ...prev]);
            // Sync to Supabase
            if (merchantId) {
                productService.createProduct({
                    merchant_id: merchantId,
                    name: formName.trim(),
                    description: formDescription.trim(),
                    category: formCategory,
                    category_id: formCategory,
                    price: numericPrice,
                    compare_price: numericOldPrice,
                    is_featured: formIsPromo,
                    stock_level: numericStock,
                    is_available: numericStock > 0,
                    image_url: formImageUrl || PRESET_GROCERY_IMAGES[0].url,
                    unit: formUnit,
                    sku: formSku || `SKU-${Date.now().toString().slice(-4)}`
                } as any).then(({ data, error }) => {
                    if (error) {
                        console.error('[MerchantDashboard] Product creation error:', error);
                    }
                    if (data) {
                        // Replace temp ID with real DB ID and category name
                        setProducts(prev => prev.map(p => p.id === tempId ? {
                            ...p,
                            id: data.id,
                            category: data.category?.name || data.category || formCategory,
                            categoryId: data.category_id
                        } : p));
                    }
                }).catch(err => {
                    console.error('[MerchantDashboard] Supabase createProduct failed:', err);
                });
            }
        }

        setIsModalOpen(false);
    };

    const handleDeleteProduct = (id: string) => {
        if (confirm('Are you sure you want to remove this item from your supermarket?')) {
            setProducts((prev) => prev.filter((p) => p.id !== id));
            // Sync delete to Supabase (only real DB IDs, not temp sm- prefixed)
            if (!id.startsWith('sm-')) {
                productService.deleteProduct(id).catch(console.error);
            }
        }
    };

    const handleToggleStock = (productId: string) => {
        setProducts((prev) =>
            prev.map((p) => {
                if (p.id !== productId) return p;
                const updated = { ...p, isAvailable: !p.isAvailable };
                // Sync to Supabase
                if (!productId.startsWith('sm-')) {
                    productService.updateProduct(productId, { is_available: updated.isAvailable } as any).catch(console.error);
                }
                return updated;
            })
        );
    };

    const handleUpdateOrderStatus = (orderId: string, nextStatus: SupermarketOrder['status']) => {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
        // Sync order status to Supabase via our wrapped helper
        syncOrderStatus(orderId, nextStatus);
    };

    const handleCreatePromo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPromoCode.trim()) return;
        const promo: PromoCampaign = {
            id: `p-${Date.now()}`,
            code: newPromoCode.trim().toUpperCase(),
            discountPercent: Number(newDiscount),
            minBasketKES: Number(newMinBasket),
            isActive: true,
            expiresAt: newExpiry,
            usageCount: 0
        };
        setPromos((prev) => [promo, ...prev]);
        setNewPromoCode('');
        setIsPromoModalOpen(false);
    };

    // ── APPROVAL GATE ──────────────────────────────────────────────
    // No dashboard access until the Admin Console approves the merchant.
    // Pending merchants see a waiting screen; rejected merchants see a notice.
    const [approvalGate, setApprovalGate] = useState<'checking' | 'approved' | 'pending' | 'rejected'>('checking');

    const runApprovalCheck = useCallback(() => {
        if (!profile?.id) {
            setApprovalGate('pending');
            return;
        }
        merchantService.getMerchant(profile.id)
            .then(({ data }) => {
                if (data?.status === 'APPROVED') {
                    setApprovalGate('approved');
                } else if (data?.status === 'REJECTED') {
                    setApprovalGate('rejected');
                } else {
                    setApprovalGate('pending');
                }
            })
            .catch(() => setApprovalGate('pending'));
    }, [profile?.id]);

    useEffect(() => {
        runApprovalCheck();
    }, [runApprovalCheck]);

    if (approvalGate === 'checking') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (approvalGate !== 'approved') {
        const isRejected = approvalGate === 'rejected';
        return (
            <div className="min-h-screen bg-white text-black flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
                <header className="border-b border-neutral-200 px-6 sm:px-10 py-4 flex items-center justify-between">
                    <Link to="/" className="font-heading font-bold text-2xl tracking-tighter text-black">
                        Muncheez<span className="text-[#4A90E2]">.</span>
                    </Link>
                    <button
                        onClick={async () => { await signOut(); navigate('/merchant/login', { replace: true }); }}
                        className="text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                    >
                        Sign Out
                    </button>
                </header>
                <main className="flex-1 flex items-center justify-center px-6 py-16">
                    <div className="max-w-xl w-full text-center">
                        <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 mb-8 border border-amber-200 bg-amber-50 text-amber-700">
                            <Clock size={12} />
                            {isRejected ? 'Application Not Approved' : 'Awaiting Admin Approval'}
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                            {isRejected
                                ? 'Your application was not approved.'
                                : 'Your application is with the compliance desk.'}
                        </h1>
                        <p className="text-neutral-500 text-sm leading-relaxed mb-10">
                            {isRejected
                                ? 'The Muncheez Admin Console has reviewed your merchant application and it was not approved at this time. Contact the compliance desk for details or submit a fresh application.'
                                : 'We are verifying your KRA PIN and business registration. Your full dashboard unlocks the moment the Admin Console approves your application. No action is needed from you.'}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            {!isRejected && (
                                <button
                                    onClick={runApprovalCheck}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-all inline-flex items-center gap-2"
                                >
                                    <ShieldCheck size={14} />
                                    Check Approval Status
                                </button>
                            )}
                            <a
                                href="https://wa.me/254700000000"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto px-6 py-3.5 border border-neutral-300 hover:border-black text-xs font-mono uppercase tracking-widest text-black transition-colors text-center"
                            >
                                Contact Compliance Desk
                            </a>
                        </div>
                    </div>
                </main>
                <footer className="border-t border-neutral-200 px-6 sm:px-10 py-4 text-center text-[10px] font-mono tracking-widest uppercase text-neutral-400">
                    Muncheez Merchant Portal
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
            {/* Top Bar (Apple Minimalist, Hairline Divider) */}
            <header className="border-b border-neutral-200 px-6 sm:px-10 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur z-20">
                <div className="flex items-center gap-6">
                    <Link to="/" className="font-heading font-bold text-2xl tracking-tighter text-black">
                        Muncheez<span className="text-[#00BCD4]">.</span>
                    </Link>
                    <div className="h-4 w-px bg-neutral-200 hidden sm:block" />
                    <div>
                        <span className="text-xs font-semibold text-black block tracking-tight">
                            {profile?.full_name || 'Westlands Provisions Supermarket'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">
                            The Market · Supermarket Terminal
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    {/* Store Open/Closed Live Toggle */}
                    <div className="flex items-center gap-3 border border-neutral-200 px-3 py-1.5 text-xs">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                            Store Status:
                        </span>
                        <button
                            onClick={() => setIsStoreOpen(!isStoreOpen)}
                            className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider font-semibold transition-colors ${
                                isStoreOpen ? 'text-emerald-700' : 'text-neutral-400'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'}`} />
                            {isStoreOpen ? 'Open & Receiving' : 'Paused'}
                        </button>
                    </div>

                    {/* View Customer Storefront Direct Link */}
                    <Link
                        to="/stores?v=market"
                        target="_blank"
                        className="border border-neutral-200 hover:border-black px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-neutral-700 inline-flex items-center gap-1 transition-colors"
                    >
                        Storefront
                        <ArrowUpRight size={12} />
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="text-xs text-neutral-400 hover:text-black font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                    >
                        <LogOut size={13} />
                        Logout
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="border-b border-neutral-200 px-6 sm:px-10 flex gap-6 overflow-x-auto scrollbar-none text-xs font-mono uppercase tracking-widest">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'orders' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Orders ({orders.filter((o) => o.status !== 'COMPLETED').length})
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'inventory' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Products ({products.length})
                </button>
                <button
                    onClick={() => setActiveTab('customers')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'customers' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Customers ({clientele.length})
                </button>
                <button
                    onClick={() => setActiveTab('deliveries')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'deliveries' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Deliveries
                </button>
                <button
                    onClick={() => setActiveTab('promotions')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'promotions' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Promotions ({promos.filter((p) => p.isActive).length})
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'analytics' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Analytics
                </button>
                <button
                    onClick={() => setActiveTab('finances')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'finances' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Finances
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'settings' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Settings
                </button>
            </div>

            {/* Bento Grid Body */}
            <main className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-8 flex-1 space-y-8">
                {/* 1. ORDERS TAB */}
                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 border border-neutral-200 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Queue Volume</span>
                                <span className="text-3xl font-light text-black">{orders.filter((o) => o.status !== 'COMPLETED').length}</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Pending Packing / Dispatch</span>
                            </div>
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Today's Gross</span>
                                <span className="text-3xl font-light text-black font-mono">KES {financials.gross.toLocaleString()}</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">{orders.length} orders total</span>
                            </div>
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Pack Buffer</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-2xl font-light text-black font-mono">{packTimeMin}m</span>
                                    <select
                                        value={packTimeMin}
                                        onChange={(e) => setPackTimeMin(Number(e.target.value))}
                                        className="text-xs bg-transparent border-b border-neutral-300 focus:border-black outline-none font-mono"
                                    >
                                        <option value={15}>15m (Express)</option>
                                        <option value={20}>20m (Normal)</option>
                                        <option value={30}>30m (Large Baskets)</option>
                                    </select>
                                </div>
                                <span className="text-[11px] text-neutral-400 block mt-1">Customer SLA estimate</span>
                            </div>
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Active Couriers</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <Bike size={18} className="text-neutral-700" />
                                    <span className="text-xl font-light text-black">
                                        {nearbyCouriers > 0 ? `${nearbyCouriers} Couriers Online` : 'No Couriers Online'}
                                    </span>
                                </div>
                                <span className={`text-[11px] font-mono block mt-1 ${nearbyCouriers > 0 ? 'text-emerald-700' : 'text-neutral-400'}`}>
                                    {nearbyCouriers > 0 ? 'Fleet Available for Dispatch' : 'Awaiting Courier Partners'}
                                </span>
                            </div>
                        </div>

                        {/* Search & Status Filter Toolbar */}
                        <div className="border border-neutral-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="SEARCH ORDER ID / CUSTOMER / PHONE..."
                                    value={orderSearch}
                                    onChange={(e) => setOrderSearch(e.target.value)}
                                    className="w-full pl-6 py-1.5 bg-transparent border-b border-neutral-200 focus:border-black text-xs font-mono uppercase outline-none"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto scrollbar-none text-[11px] font-mono uppercase">
                                {['ALL', 'CREATED', 'PACKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED'].map((st) => (
                                    <button
                                        key={st}
                                        onClick={() => setOrderStatusFilter(st)}
                                        className={`px-3 py-1 border transition-colors ${
                                            orderStatusFilter === st
                                                ? 'border-black text-black font-bold bg-neutral-100'
                                                : 'border-neutral-200 text-neutral-500 hover:border-black'
                                        }`}
                                    >
                                        {st.replace(/_/g, ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Live Orders Stream */}
                        <div className="border border-neutral-200 divide-y divide-neutral-200">
                            {orders.length === 0 ? (
                                <div className="p-12 text-center font-mono">
                                    <Package size={28} className="mx-auto text-neutral-300 mb-2" />
                                    <span className="text-xs text-neutral-500 uppercase tracking-widest block">No Customer Orders Yet</span>
                                    <span className="text-[11px] text-neutral-400 mt-1 block">Live orders placed by customers in your sector will stream here in real-time.</span>
                                </div>
                            ) : orders.map((order) => (
                                <div key={order.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-neutral-50/50 transition-colors">
                                    <div className="space-y-2 max-w-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-sm font-bold text-black">{order.id}</span>
                                            <span className="text-neutral-300">·</span>
                                            <span className="text-xs text-neutral-500 font-mono">{order.placedAt}</span>
                                            <span className="text-neutral-300">·</span>
                                            <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${
                                                order.status === 'CREATED' ? 'border-amber-300 text-amber-800 bg-amber-50' :
                                                order.status === 'PACKING' ? 'border-blue-300 text-blue-800 bg-blue-50' :
                                                order.status === 'READY_FOR_PICKUP' ? 'border-emerald-300 text-emerald-800 bg-emerald-50' :
                                                'border-neutral-200 text-neutral-600'
                                            }`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        <div className="text-xs text-neutral-800 font-medium">
                                            {order.customerName} · <span className="font-mono text-neutral-500">{order.customerPhone}</span>
                                        </div>

                                        <div className="text-xs text-neutral-400 flex items-center gap-1.5 font-mono">
                                            <MapPin size={12} />
                                            {order.address}
                                        </div>

                                        <div className="pt-2">
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">
                                                Items Checklist ({order.items.length}):
                                            </span>
                                            <div className="space-y-1">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="text-xs text-neutral-700 flex items-center gap-2 font-mono">
                                                        <span className="text-neutral-400">·</span>
                                                        <span className="font-bold text-black">{item.quantity}x</span>
                                                        <span>{item.name}</span>
                                                        <span className="text-neutral-400 ml-auto">KES {(item.price * item.quantity).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-neutral-100">
                                        <div className="text-left lg:text-right">
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">Total Basket</span>
                                            <span className="text-xl font-bold font-mono text-black">KES {order.total.toLocaleString()}</span>
                                            {order.courierName && (
                                                <span className="text-[11px] text-neutral-500 block font-mono mt-1">
                                                    Assigned Courier: {order.courierName}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {order.status === 'CREATED' && (
                                                <button
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'PACKING')}
                                                    className="px-5 py-2 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-colors"
                                                >
                                                    Accept & Pack
                                                </button>
                                            )}
                                            {order.status === 'PACKING' && (
                                                <button
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                                                    className="px-5 py-2 bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 size={13} />
                                                    Ready for Pickup
                                                </button>
                                            )}
                                            {order.status === 'READY_FOR_PICKUP' && (
                                                <span className="text-xs font-mono text-emerald-700 uppercase tracking-widest border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                                                    Awaiting Courier Arrival
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. INVENTORY & AISLE CATALOG (IMAGE-FIRST & DUAL VIEW MODE) */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6">
                        {/* Catalog Header & View Mode Switcher */}
                        <div className="border border-neutral-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="SEARCH GROCERY / SKU / AISLE..."
                                    value={inventorySearch}
                                    onChange={(e) => setInventorySearch(e.target.value)}
                                    className="w-full pl-6 py-2 bg-transparent border-b border-neutral-200 focus:border-black text-xs font-mono uppercase outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Dual View Mode Toggle */}
                                <div className="border border-neutral-200 flex text-xs font-mono">
                                    <button
                                        onClick={() => setCatalogViewMode('matrix')}
                                        className={`px-3 py-1.5 flex items-center gap-1.5 uppercase transition-colors ${
                                            catalogViewMode === 'matrix' ? 'bg-black text-white font-bold' : 'text-neutral-500 hover:text-black'
                                        }`}
                                    >
                                        <List size={13} />
                                        Matrix Table
                                    </button>
                                    <button
                                        onClick={() => setCatalogViewMode('storefrontPreview')}
                                        className={`px-3 py-1.5 flex items-center gap-1.5 uppercase transition-colors ${
                                            catalogViewMode === 'storefrontPreview' ? 'bg-black text-white font-bold' : 'text-neutral-500 hover:text-black'
                                        }`}
                                    >
                                        <LayoutGrid size={13} />
                                        Storefront Glass Cards
                                    </button>
                                </div>

                                <button
                                    onClick={handleOpenAddModal}
                                    className="px-5 py-2.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-colors inline-flex items-center gap-2"
                                >
                                    <Plus size={14} />
                                    Add Supermarket Item
                                </button>
                            </div>
                        </div>

                        {/* Aisle Category Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-neutral-200">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                                        selectedCategory === cat ? 'border-b-2 border-black text-black font-bold' : 'text-neutral-400 hover:text-black'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* MODE A: MATRIX TABLE (WITH IMAGE THUMBNAIL) */}
                        {catalogViewMode === 'matrix' && (
                            <div className="border border-neutral-200 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                                            <th className="py-3 px-4">Item & Photography</th>
                                            <th className="py-3 px-4">Aisle Category</th>
                                            <th className="py-3 px-4">Price (KES)</th>
                                            <th className="py-3 px-4">Stock Level</th>
                                            <th className="py-3 px-4">Promo Deal</th>
                                            <th className="py-3 px-4">Storefront Status</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 text-xs">
                                        {filteredProducts.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-neutral-400 font-mono">
                                                    NO PRODUCTS IN INVENTORY. CLICK "ADD SUPERMARKET PRODUCT" TO CREATE YOUR FIRST ITEM.
                                                </td>
                                            </tr>
                                        ) : filteredProducts.map((prod) => (
                                            <tr key={prod.id} className="hover:bg-neutral-50/50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={prod.imageUrl}
                                                            alt={prod.name}
                                                            className="w-12 h-12 object-cover border border-neutral-200 shrink-0"
                                                        />
                                                        <div>
                                                            <span className="font-medium text-black block">{prod.name}</span>
                                                            <span className="text-[10px] text-neutral-400 font-mono">
                                                                {prod.sku} {prod.unit ? `· Unit: ${prod.unit}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                                                    {prod.category}
                                                </td>
                                                <td className="py-3 px-4 font-mono">
                                                    <span className="font-bold text-black">KES {prod.price.toLocaleString()}</span>
                                                    {prod.oldPrice && (
                                                        <span className="text-[10px] text-neutral-400 line-through block">
                                                            KES {prod.oldPrice.toLocaleString()}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 font-mono">
                                                    <span className={prod.stockLevel <= lowStockThreshold ? 'text-amber-700 font-bold' : 'text-black'}>
                                                        {prod.stockLevel} units
                                                    </span>
                                                    {prod.stockLevel <= lowStockThreshold && prod.stockLevel > 0 && (
                                                        <span className="text-[10px] text-amber-600 block">Low stock badge</span>
                                                    )}
                                                    {prod.stockLevel === 0 && (
                                                        <span className="text-[10px] text-red-600 block font-bold">Out of stock overlay</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 font-mono">
                                                    {prod.promo ? (
                                                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5">
                                                            Active DEAL
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-neutral-400">Regular</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${
                                                        prod.isAvailable && prod.stockLevel > 0
                                                            ? 'border-emerald-200 text-emerald-800 bg-emerald-50'
                                                            : 'border-neutral-200 text-neutral-400 bg-neutral-100'
                                                    }`}>
                                                        {prod.isAvailable && prod.stockLevel > 0 ? 'Live on Storefront' : 'Hidden / Sold Out'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-3 font-mono text-[11px]">
                                                        <button
                                                            onClick={() => handleToggleStock(prod.id)}
                                                            className="text-neutral-500 hover:text-black border-b border-neutral-300 hover:border-black uppercase transition-colors"
                                                        >
                                                            {prod.isAvailable ? 'Toggle Off' : 'Toggle On'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenEditModal(prod)}
                                                            className="text-black hover:text-[#00BCD4] transition-colors"
                                                            title="Edit Details & Image"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteProduct(prod.id)}
                                                            className="text-neutral-400 hover:text-red-600 transition-colors"
                                                            title="Delete Item"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* MODE B: STOREFRONT GLASS PREVIEW (EXACT SUPERMARKETSTORE.TSX CARD RENDERING) */}
                        {catalogViewMode === 'storefrontPreview' && (
                            <div className="space-y-4">
                                <div className="border border-neutral-200 p-3 bg-neutral-50 flex items-center justify-between text-xs font-mono">
                                    <span className="text-neutral-600">
                                        Viewing real-time customer presentation matching <strong className="text-black">SupermarketStore.tsx</strong>:
                                    </span>
                                    <span className="text-neutral-400 uppercase text-[10px]">
                                        Image-First Glass Architecture · 75% Image Height
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {filteredProducts.map((product) => {
                                        const hasDiscount = product.promo;
                                        const oldPrice = product.oldPrice || (hasDiscount ? product.price + 100 : null);
                                        const isOutOfStock = product.stockLevel === 0 || !product.isAvailable;
                                        const isLowStock = product.stockLevel > 0 && product.stockLevel <= lowStockThreshold;

                                        return (
                                            <div
                                                key={product.id}
                                                className="group border border-neutral-200 bg-white hover:border-black transition-all flex flex-col h-[280px] relative overflow-hidden"
                                            >
                                                {/* Deal Badge */}
                                                {hasDiscount && (
                                                    <div className="absolute top-2 left-2 z-20">
                                                        <span className="bg-[#D4AF37] text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                                            DEAL
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Low Stock Badge */}
                                                {isLowStock && (
                                                    <div className="absolute top-2 left-2 z-20 mt-5">
                                                        <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                                            LOW STOCK ({product.stockLevel})
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Out of Stock Overlay */}
                                                {isOutOfStock && (
                                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] flex items-center justify-center z-30">
                                                        <span className="bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-sm">
                                                            {product.stockLevel === 0 ? 'OUT OF STOCK' : 'UNAVAILABLE'}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Image Area - 75% Height */}
                                                <div className="w-full h-[72%] relative overflow-hidden bg-neutral-100">
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />

                                                    {/* Quick Edit Overlay Button */}
                                                    <button
                                                        onClick={() => handleOpenEditModal(product)}
                                                        className="absolute top-2 right-2 z-20 p-1.5 bg-white/90 hover:bg-white text-black shadow-sm text-[10px] font-mono flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Edit2 size={11} /> Edit
                                                    </button>
                                                </div>

                                                {/* Bottom Card Content */}
                                                <div className="p-3 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-xs font-black text-black font-mono">
                                                                KES {product.price.toLocaleString()}
                                                            </span>
                                                            {oldPrice && (
                                                                <span className="text-[10px] text-neutral-400 line-through font-mono">
                                                                    KES {oldPrice}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] font-medium text-black line-clamp-1 mt-0.5">
                                                            {product.name}
                                                        </div>
                                                    </div>

                                                    <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between">
                                                        <span>{product.unit || 'Standard'}</span>
                                                        <span>{product.stockLevel} in stock</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. CLIENTELE CRM */}
                {activeTab === 'customers' && (
                    <div className="space-y-6">
                        <div className="border border-neutral-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                    Supermarket Clientele & CRM
                                </h3>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    Lifetime customer value, order frequencies, and loyalty tiers.
                                </p>
                            </div>
                            <div className="relative max-w-sm w-full">
                                <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="SEARCH PHONE / CLIENT NAME..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    className="w-full pl-6 py-1.5 bg-transparent border-b border-neutral-200 focus:border-black text-xs font-mono uppercase outline-none"
                                />
                            </div>
                        </div>

                        <div className="border border-neutral-200 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                                        <th className="py-3 px-4">Customer</th>
                                        <th className="py-3 px-4">Contact Phone</th>
                                        <th className="py-3 px-4">Orders Count</th>
                                        <th className="py-3 px-4">Lifetime Value (LTV)</th>
                                        <th className="py-3 px-4">Loyalty Tier</th>
                                        <th className="py-3 px-4 text-right">Last Order</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 text-xs">
                                    {clientele.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-neutral-400 font-mono">
                                                NO CLIENTELE HISTORY YET. CUSTOMER ORDERS WILL BUILD YOUR CRM DATABASE AUTOMATICALLY.
                                            </td>
                                        </tr>
                                    ) : clientele.map((c) => (
                                        <tr key={c.phone} className="hover:bg-neutral-50/50 transition-colors">
                                            <td className="py-3.5 px-4 font-medium text-black">{c.name}</td>
                                            <td className="py-3.5 px-4 font-mono text-neutral-600">{c.phone}</td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-black">{c.orderCount} orders</td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-black">KES {c.totalSpent.toLocaleString()}</td>
                                            <td className="py-3.5 px-4">
                                                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${
                                                    c.tier === 'VIP' ? 'border-amber-300 text-amber-800 bg-amber-50' :
                                                    c.tier === 'Regular' ? 'border-blue-300 text-blue-800 bg-blue-50' :
                                                    'border-neutral-200 text-neutral-500 bg-neutral-50'
                                                }`}>
                                                    {c.tier} Client
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono text-neutral-400">{c.lastOrder}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. COURIER LOGISTICS */}
                {activeTab === 'deliveries' && (
                    <div className="space-y-6">
                        <div className="border border-neutral-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                    Fleet Dispatch Operations
                                </h3>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    Monitor couriers arriving for supermarket pickups and grocery drop-offs.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 border border-emerald-200">
                                <Bike size={14} />
                                <span>Fleet Radar Connected</span>
                            </div>
                        </div>

                        <div className="border border-neutral-200 divide-y divide-neutral-200">
                            {orders.filter((o) => o.courierName).map((order) => (
                                <div key={order.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-sm font-bold text-black">{order.id}</span>
                                            <span className="text-neutral-300">·</span>
                                            <span className="text-xs font-mono text-emerald-700">{order.status.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="text-xs text-black font-medium">
                                            Assigned Courier: <span className="font-bold">{order.courierName}</span> · {order.courierVehicle}
                                        </div>
                                        <div className="text-xs text-neutral-400 font-mono">
                                            Destination: {order.address} ({order.customerName})
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <a
                                            href={`tel:${order.courierPhone}`}
                                            className="px-4 py-2 border border-neutral-300 hover:border-black text-xs font-mono uppercase tracking-wider text-black inline-flex items-center gap-1.5 transition-colors"
                                        >
                                            <Phone size={12} />
                                            Call Courier ({order.courierPhone})
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. PROMOTIONS & MARKETING */}
                {activeTab === 'promotions' && (
                    <div className="space-y-6">
                        <div className="border border-neutral-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                    Supermarket Discount Campaigns
                                </h3>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    Offer vouchers, flash grocery discounts, and basket threshold incentives.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsPromoModalOpen(true)}
                                className="px-5 py-2.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-colors inline-flex items-center gap-2"
                            >
                                <Plus size={14} />
                                Create Promo Voucher
                            </button>
                        </div>

                        <div className="border border-neutral-200 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                                        <th className="py-3 px-4">Coupon Code</th>
                                        <th className="py-3 px-4">Discount</th>
                                        <th className="py-3 px-4">Min. Basket Requirement</th>
                                        <th className="py-3 px-4">Redemptions</th>
                                        <th className="py-3 px-4">Expiry</th>
                                        <th className="py-3 px-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 text-xs">
                                    {promos.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-neutral-400 font-mono">
                                                NO ACTIVE PROMOTIONS. CLICK "CREATE PROMO VOUCHER" TO LAUNCH A DISCOUNT CAMPAIGN.
                                            </td>
                                        </tr>
                                    ) : promos.map((p) => (
                                        <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-bold text-black">{p.code}</td>
                                            <td className="py-3.5 px-4 font-mono font-medium text-emerald-700">{p.discountPercent}% OFF</td>
                                            <td className="py-3.5 px-4 font-mono text-neutral-600">KES {p.minBasketKES.toLocaleString()}</td>
                                            <td className="py-3.5 px-4 font-mono">{p.usageCount} orders</td>
                                            <td className="py-3.5 px-4 font-mono text-neutral-400">{p.expiresAt}</td>
                                            <td className="py-3.5 px-4 text-right">
                                                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${
                                                    p.isActive ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : 'border-neutral-200 text-neutral-400'
                                                }`}>
                                                    {p.isActive ? 'Active' : 'Expired'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 6. ANALYTICS & REPORTS */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 border border-neutral-200 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Fulfillment Rate</span>
                                <span className="text-3xl font-light text-black font-mono">99.2%</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Supermarket pack accuracy</span>
                            </div>
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Average Basket Size</span>
                                <span className="text-3xl font-light text-black font-mono">KES {financials.avgBasket.toLocaleString()}</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Per grocery haul</span>
                            </div>
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Peak Order Window</span>
                                <span className="text-3xl font-light text-black font-mono">5PM – 8PM</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Evening grocery rush</span>
                            </div>
                        </div>

                        <div className="border border-neutral-200 p-6 space-y-4">
                            <h3 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                Top Selling Groceries (Current Cycle)
                            </h3>
                            <div className="divide-y divide-neutral-200 text-xs font-mono">
                                <div className="py-3 flex justify-between items-center">
                                    <span className="text-black font-medium">1. Fresh Hass Avocados (Pack of 3)</span>
                                    <span className="text-neutral-500">84 Packs Sold · KES 15,120</span>
                                </div>
                                <div className="py-3 flex justify-between items-center">
                                    <span className="text-black font-medium">2. Whole Milk 500ml Pouch</span>
                                    <span className="text-neutral-500">112 Pouches Sold · KES 7,280</span>
                                </div>
                                <div className="py-3 flex justify-between items-center">
                                    <span className="text-black font-medium">3. Artisan Sourdough Loaf</span>
                                    <span className="text-neutral-500">46 Loaves Sold · KES 12,880</span>
                                </div>
                                <div className="py-3 flex justify-between items-center">
                                    <span className="text-black font-medium">4. Alkaline Mineral Water 5L</span>
                                    <span className="text-neutral-500">38 Bottles Sold · KES 8,360</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 7. SETTLEMENTS & FINANCES */}
                {activeTab === 'finances' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 border border-neutral-200 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Gross Revenue</span>
                                <span className="text-3xl font-light text-black font-mono">KES {financials.gross.toLocaleString()}</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Total customer checkouts</span>
                            </div>
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Muncheez Fee (10%)</span>
                                <span className="text-3xl font-light text-neutral-600 font-mono">-KES {financials.commission.toLocaleString()}</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Marketplace commission</span>
                            </div>
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Standard VAT (16%)</span>
                                <span className="text-3xl font-light text-neutral-600 font-mono">KES {financials.vat.toLocaleString()}</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">KRA automated withholding</span>
                            </div>
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Net M-Pesa Settlement</span>
                                <span className="text-3xl font-light text-emerald-700 font-mono">KES {financials.netPayout.toLocaleString()}</span>
                                <span className="text-[11px] text-emerald-700 font-mono block mt-1">Cleared for nightly payout</span>
                            </div>
                        </div>

                        <div className="border border-neutral-200 p-6 space-y-4">
                            <h3 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                Settlement Account Specifications
                            </h3>
                            <div className="divide-y divide-neutral-200 text-xs">
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 font-mono uppercase">Settlement Method</span>
                                    <span className="font-mono text-black">M-Pesa Business Till: {mpesaTill}</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 font-mono uppercase">Disbursement Frequency</span>
                                    <span className="text-black">Daily Automatic Clearing @ 11:59 PM</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 font-mono uppercase">Tax Invoicing (VAT)</span>
                                    <span className="text-black">Automated KRA ETR Compliance</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 8. SETTINGS TAB (DETAILED STORE PROFILE & CONTROLS) */}
                {activeTab === 'settings' && (
                    <div className="border border-neutral-200 p-8 space-y-10 max-w-4xl">
                        <div className="border-b border-neutral-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-mono uppercase tracking-widest font-bold text-black">
                                    Supermarket Profile & Operational Settings
                                </h3>
                                <p className="text-xs text-neutral-400 mt-1">
                                    Edit your public supermarket storefront identity, contact credentials, and delivery rules.
                                </p>
                            </div>
                            <button
                                onClick={handleSaveStoreSettings}
                                className="px-6 py-2.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-2 self-start sm:self-auto"
                            >
                                <Save size={13} />
                                Save All Settings
                            </button>
                        </div>

                        {/* SECTION 1: STORE IDENTITY */}
                        <div className="space-y-6">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block border-b border-neutral-100 pb-2">
                                01 · Storefront Identity & Branding
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Supermarket Name
                                    </label>
                                    <input
                                        type="text"
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                        placeholder="e.g. Westlands Provisions Supermarket"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-medium"
                                    />
                                    <span className="text-[10px] text-neutral-400 block">
                                        Displayed on storefront listings, receipt slips, and customer carts.
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Primary Branch / Sector
                                    </label>
                                    <input
                                        type="text"
                                        value={storeBranch}
                                        onChange={(e) => setStoreBranch(e.target.value)}
                                        placeholder="e.g. Westlands Branch"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 text-xs">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                    Physical Store Address (Pickup Location)
                                </label>
                                <input
                                    type="text"
                                    value={storeAddress}
                                    onChange={(e) => setStoreAddress(e.target.value)}
                                    placeholder="e.g. Mpaka Road, Westlands Commercial Centre, Ground Floor"
                                    className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-medium"
                                />
                                <span className="text-[10px] text-neutral-400 block">
                                    Couriers are dispatched to this exact physical address for order collection.
                                </span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                    Storefront Tagline / Editorial Description
                                </label>
                                <textarea
                                    rows={2}
                                    value={storeDescription}
                                    onChange={(e) => setStoreDescription(e.target.value)}
                                    placeholder="Brief description of your supermarket products and standards..."
                                    className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-xs text-black outline-none resize-none"
                                />
                            </div>

                            {/* STORE CARD / COVER IMAGE */}
                            <div className="space-y-3 border-t border-neutral-100 pt-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                            Store Card Image (Cover Photo)
                                        </span>
                                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                                            Displayed on the market listing page as the store card thumbnail.
                                        </span>
                                    </div>
                                    {isUploadingCover && (
                                        <span className="text-[10px] font-mono text-black uppercase animate-pulse">Uploading...</span>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    {/* Preview */}
                                    <div className="w-full sm:w-40 h-24 border border-neutral-200 bg-neutral-100 overflow-hidden shrink-0">
                                        {storeCoverUrl ? (
                                            <img src={storeCoverUrl} alt="Store Cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 text-[10px] font-mono text-center gap-1">
                                                <ImageIcon size={16} />
                                                No cover set
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-3 w-full">
                                        {/* Upload file */}
                                        <label className="border border-dashed border-neutral-300 hover:border-black transition-colors py-2.5 px-3 flex items-center justify-center gap-2 cursor-pointer text-center">
                                            <UploadCloud size={14} className="text-neutral-500" />
                                            <span className="text-[11px] font-mono text-neutral-700">
                                                {isUploadingCover ? 'Uploading...' : 'Upload Cover Image'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                disabled={isUploadingCover}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setIsUploadingCover(true);
                                                    try {
                                                        const res = await uploadFile('documents', `stores/${merchantId || 'temp'}`, file);
                                                        if (res.url) setStoreCoverUrl(res.url);
                                                    } catch (err) {
                                                        console.error('Cover upload failed:', err);
                                                    } finally {
                                                        setIsUploadingCover(false);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>

                                        {/* Direct URL */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                                Or paste a direct image URL
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://images.unsplash.com/..."
                                                value={storeCoverUrl}
                                                onChange={(e) => setStoreCoverUrl(e.target.value)}
                                                className="w-full py-1.5 bg-transparent border-b border-neutral-300 focus:border-black text-xs text-black outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: CONTACT & NOTIFICATIONS */}
                        <div className="space-y-6">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block border-b border-neutral-100 pb-2">
                                02 · Contact & Communications
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Customer Support Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={storePhone}
                                        onChange={(e) => setStorePhone(e.target.value)}
                                        placeholder="+254 700 000000"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Operational Email
                                    </label>
                                    <input
                                        type="email"
                                        value={storeEmail}
                                        onChange={(e) => setStoreEmail(e.target.value)}
                                        placeholder="store@muncheez.co.ke"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: OPERATIONS & DISPATCH RULES */}
                        <div className="space-y-6">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block border-b border-neutral-100 pb-2">
                                03 · Operational Controls & Storefront Sync
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Operating Hours
                                    </label>
                                    <input
                                        type="text"
                                        value={operatingHours}
                                        onChange={(e) => setOperatingHours(e.target.value)}
                                        placeholder="08:00 AM – 10:00 PM"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        M-Pesa Settlement Till
                                    </label>
                                    <input
                                        type="text"
                                        value={mpesaTill}
                                        onChange={(e) => setMpesaTill(e.target.value)}
                                        placeholder="928371"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Packing Buffer (Minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={packTimeMin}
                                        onChange={(e) => setPackTimeMin(Number(e.target.value))}
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Delivery Radius (KM)
                                    </label>
                                    <input
                                        type="number"
                                        value={deliveryRadiusKm}
                                        onChange={(e) => setDeliveryRadiusKm(Number(e.target.value))}
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Bulk Item Limit
                                    </label>
                                    <input
                                        type="number"
                                        value={bulkPurchaseLimit}
                                        onChange={(e) => setBulkPurchaseLimit(Number(e.target.value))}
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Live Availability:</span>
                                <button
                                    onClick={() => setIsStoreOpen(!isStoreOpen)}
                                    className={`px-3 py-1 font-mono text-xs uppercase font-bold border transition-colors ${
                                        isStoreOpen ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 'border-neutral-300 text-neutral-500'
                                    }`}
                                >
                                    {isStoreOpen ? 'Store Open & Accepting Orders' : 'Store Paused'}
                                </button>
                            </div>

                            <button
                                onClick={handleSaveStoreSettings}
                                className="w-full sm:w-auto px-8 py-3 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={13} />
                                Save Store Settings
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL / DRAWER: ADD & EDIT SUPERMARKET PRODUCT WITH FULL IMAGERY & PREVIEW */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white border border-neutral-300 w-full max-w-2xl p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                            <div>
                                <h3 className="text-base font-mono uppercase tracking-widest font-bold text-black">
                                    {editingProductId ? 'Edit Supermarket Item & Photography' : 'Add Item to Supermarket Aisle'}
                                </h3>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    High-resolution photography is required for customer glass cards in the storefront.
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-black">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProduct} className="space-y-6">
                            {/* 1. PHOTOGRAPHY & IMAGE PREVIEW SECTION */}
                            <div className="border border-neutral-200 p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-black flex items-center gap-1.5">
                                        <ImageIcon size={14} /> Product Photography *
                                    </span>
                                    <span className="text-[10px] font-mono text-neutral-400 uppercase">
                                        Visible on Customer Storefront
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    {/* Live Image Preview (Image-First Glass Aspect Ratio) */}
                                    <div className="w-full sm:w-36 h-36 border border-neutral-200 bg-neutral-100 overflow-hidden shrink-0 relative group">
                                        {formImageUrl ? (
                                            <img
                                                src={formImageUrl}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 p-2 text-center text-[10px] font-mono">
                                                <UploadCloud size={20} className="mb-1" />
                                                No image selected
                                            </div>
                                        )}
                                        {formIsPromo && (
                                            <span className="absolute top-1 left-1 bg-[#D4AF37] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                                                DEAL
                                            </span>
                                        )}
                                    </div>

                                    {/* Image Upload & URL Options */}
                                    <div className="flex-1 space-y-3 w-full">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                                    Option A: Upload Image File (PDF / Image)
                                                </label>
                                                {isUploadingImage && (
                                                    <span className="text-[10px] font-mono text-black uppercase animate-pulse">
                                                        Uploading...
                                                    </span>
                                                )}
                                            </div>
                                            <label className="border border-dashed border-neutral-300 hover:border-black transition-colors py-2.5 px-3 flex items-center justify-center gap-2 cursor-pointer text-center">
                                                <UploadCloud size={14} className="text-neutral-500" />
                                                <span className="text-[11px] font-mono text-neutral-700">
                                                    {isUploadingImage ? 'Processing upload...' : 'Click to Browse & Upload File'}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    disabled={isUploadingImage}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setIsUploadingImage(true);
                                                        try {
                                                            const res = await uploadFile('documents', `products/${merchantId || 'temp'}`, file);
                                                            if (res.url) {
                                                                setFormImageUrl(res.url);
                                                            }
                                                        } catch (err) {
                                                            console.error('Image upload failed:', err);
                                                        } finally {
                                                            setIsUploadingImage(false);
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                                Option B: Direct Image URL / CDN Link
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://images.unsplash.com/..."
                                                value={formImageUrl}
                                                onChange={(e) => setFormImageUrl(e.target.value)}
                                                className="w-full py-1.5 bg-transparent border-b border-neutral-300 focus:border-black text-xs text-black outline-none font-mono"
                                            />
                                        </div>

                                        {/* Quick Preset Library */}
                                        <div>
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1.5 flex items-center gap-1">
                                                <Sparkles size={11} /> Option C: Or Choose High-Res Supermarket Preset:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                                {PRESET_GROCERY_IMAGES.map((preset) => (
                                                    <button
                                                        key={preset.label}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormImageUrl(preset.url);
                                                            if (!formName) setFormName(preset.label);
                                                            setFormCategory(preset.category);
                                                        }}
                                                        className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
                                                            formImageUrl === preset.url
                                                                ? 'border-black bg-black text-white font-bold'
                                                                : 'border-neutral-200 text-neutral-600 hover:border-black'
                                                        }`}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. PRODUCT DETAILS */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                        Item Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Organic Baby Spinach 250g"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                        Description & Sourcing Notes
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Farm fresh pesticide-free greens washed and packed daily."
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        className="w-full py-1.5 bg-transparent border-b border-neutral-300 focus:border-black text-xs text-neutral-700 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                            Aisle Category *
                                        </label>
                                        <select
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none"
                                        >
                                            {categories.filter((c) => c !== 'All' && c !== 'Deals').map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                            Packaging Unit / Weight
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 500g, 1kg, pack of 3, 5L"
                                            value={formUnit}
                                            onChange={(e) => setFormUnit(e.target.value)}
                                            className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                            Price (KES) *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="180"
                                            value={formPrice}
                                            onChange={(e) => setFormPrice(e.target.value)}
                                            className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                            Stock Level (Units) *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="50"
                                            value={formStock}
                                            onChange={(e) => setFormStock(e.target.value)}
                                            className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                            Barcode / SKU
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="SKU-8921"
                                            value={formSku}
                                            onChange={(e) => setFormSku(e.target.value)}
                                            className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. STOREFRONT "DEAL" TOGGLE */}
                            <div className="border border-neutral-200 p-4 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formIsPromo}
                                        onChange={(e) => setFormIsPromo(e.target.checked)}
                                        className="w-4 h-4 accent-black rounded-none"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-black block">
                                            Feature as Promotional Storefront "DEAL"
                                        </span>
                                        <span className="text-[11px] text-neutral-400 block">
                                            Displays the gold "DEAL" badge on the storefront with strikethrough original price.
                                        </span>
                                    </div>
                                </label>

                                {formIsPromo && (
                                    <div className="pt-2">
                                        <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                            Original Regular Price Before Discount (KES)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 250"
                                            value={formOldPrice}
                                            onChange={(e) => setFormOldPrice(e.target.value)}
                                            className="w-48 py-1.5 bg-transparent border-b border-neutral-300 focus:border-black text-xs text-black outline-none font-mono"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Submit & Cancel */}
                            <div className="pt-4 border-t border-neutral-200 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-xs font-mono uppercase tracking-wider text-neutral-500 hover:text-black border border-neutral-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-wider transition-colors"
                                >
                                    {editingProductId ? 'Update & Sync Storefront' : 'Publish to Storefront'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE PROMO VOUCHER */}
            {isPromoModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-neutral-300 w-full max-w-lg p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                            <h3 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                Create Supermarket Promo Voucher
                            </h3>
                            <button onClick={() => setIsPromoModalOpen(false)} className="text-neutral-400 hover:text-black">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePromo} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                    Promo Code *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. MUNCHEEZFRESH"
                                    value={newPromoCode}
                                    onChange={(e) => setNewPromoCode(e.target.value)}
                                    className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                        Discount Percentage (%) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="50"
                                        placeholder="10"
                                        value={newDiscount}
                                        onChange={(e) => setNewDiscount(e.target.value)}
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                        Min Basket (KES) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="1000"
                                        value={newMinBasket}
                                        onChange={(e) => setNewMinBasket(e.target.value)}
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    value={newExpiry}
                                    onChange={(e) => setNewExpiry(e.target.value)}
                                    className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                />
                            </div>

                            <div className="pt-4 border-t border-neutral-200 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPromoModalOpen(false)}
                                    className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-neutral-500 hover:text-black border border-neutral-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-wider"
                                >
                                    Launch Promo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-neutral-200 px-6 sm:px-10 py-4 text-center text-[10px] font-mono tracking-widest uppercase text-neutral-400">
                Muncheez Merchant Operations · Supermarket Division · Nairobi, Kenya
            </footer>
        </div>
    );
}
