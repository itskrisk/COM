import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SupermarketStore from './store-types/SupermarketStore';
import { publicApi } from '../../lib/api';
import PageSEO from '../../components/SEO';
import { storeCache } from '../../context/StoreCache';

// Normalise raw DB product → camelCase shape SupermarketStore expects
function normaliseProduct(p: any, fallbackMerchantId: string) {
    const resolvedCategory =
        p.category?.name ||
        p.category ||
        (Array.isArray(p.tags) && p.tags[0]) ||
        (p.metadata?.tags && p.metadata.tags[0]) ||
        'Food Cupboard';
    return {
        id: p.id,
        merchantId: p.merchant_id || fallbackMerchantId,
        name: p.name,
        description: p.description || '',
        categoryId: resolvedCategory,
        category: resolvedCategory,
        price: Number(p.price) || 0,
        oldPrice: p.compare_price ? Number(p.compare_price) : null,
        promo: Boolean(p.is_featured),
        isFeatured: Boolean(p.is_featured),
        stockLevel: p.stock_level ?? 50,
        isAvailable: p.is_available === false ? false : true,
        imageUrl: p.image_url || p.imageUrl || '',
        unit: p.unit || p.metadata?.unit || 'unit',
        sku: p.sku || `SKU-${p.id?.slice(-4)?.toUpperCase() || '0000'}`,
    };
}

export default function StoreFront() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Seed from cache immediately — no blank screen on revisit
    const [merchant, setMerchant] = useState<any>(() => (id ? storeCache.getStore(id) : null));
    const [merchantProducts, setMerchantProducts] = useState<any[]>(() =>
        id ? storeCache.getProducts(id) ?? [] : []
    );
    const [loading, setLoading] = useState<boolean>(() => {
        // If we have cached store + products, we don't need to show a loader
        if (!id) return true;
        return storeCache.isStoreStale(id) || storeCache.isProductsStale(id);
    });

    useEffect(() => {
        if (!id) return;

        const cachedStore = storeCache.getStore(id);
        const cachedProducts = storeCache.getProducts(id);
        const storeStale = storeCache.isStoreStale(id);
        const productsStale = storeCache.isProductsStale(id);

        // If both are cached and fresh — render immediately, nothing to do
        if (cachedStore && cachedProducts && !storeStale && !productsStale) {
            setMerchant(cachedStore);
            setMerchantProducts(cachedProducts);
            setLoading(false);
            return;
        }

        // Fire both requests in parallel
        const fetchAll = async () => {
            try {
                const [storeResult, productsResult] = await Promise.all([
                    storeStale ? publicApi.getStore(id) : Promise.resolve({ data: cachedStore, error: null }),
                    productsStale ? publicApi.getStoreProducts(id) : Promise.resolve({ data: cachedProducts, error: null }),
                ]);

                if (storeResult.data) {
                    storeCache.setStore(id, storeResult.data);
                    setMerchant(storeResult.data);
                }

                if (productsResult.data && productsResult.data.length > 0) {
                    const normalised = productsResult.data.map((p: any) => normaliseProduct(p, id));
                    storeCache.setProducts(id, normalised);
                    setMerchantProducts(normalised);
                } else if (!cachedProducts) {
                    setMerchantProducts([]);
                }
            } catch (err) {
                console.error('Error loading store:', err);
                if (!cachedStore) setMerchantProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [id]);


    // Only show full-screen skeleton when we have absolutely nothing cached
    if (loading && !merchant) {
        return (
            <div className="min-h-screen bg-black animate-pulse">
                {/* Skeleton Header */}
                <div className="bg-[#4A90E2] pt-6 pb-24 px-6 lg:px-12 relative overflow-hidden">
                    {/* Nav bar skeleton */}
                    <div className="flex items-center justify-between mb-10">
                        <div className="h-6 w-28 bg-white/20 rounded" />
                        <div className="h-6 w-48 bg-white/10 rounded hidden md:block" />
                        <div className="h-6 w-20 bg-white/20 rounded" />
                    </div>
                    {/* Title skeleton */}
                    <div className="space-y-3 mt-6">
                        <div className="h-3 w-24 bg-white/20 rounded" />
                        <div className="h-14 w-72 bg-white/20 rounded" />
                    </div>
                </div>
                {/* Skeleton Products */}
                <div className="bg-[#D4AF37] px-6 py-16">
                    <div className="max-w-7xl mx-auto">
                        <div className="h-6 w-40 bg-black/10 rounded mb-8" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="bg-black/10 rounded-2xl overflow-hidden">
                                    <div className="h-40 bg-black/10" />
                                    <div className="p-3 space-y-2">
                                        <div className="h-4 w-16 bg-black/10 rounded" />
                                        <div className="h-3 w-24 bg-black/10 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!merchant) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center text-white">
                <h1 className="text-2xl font-bold mb-4">Store Not Found</h1>
                <button onClick={() => navigate('/stores?v=market')} className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl">
                    Back to Market
                </button>
            </div>
        );
    }

    // Platform is dedicated to supermarkets
    return (
        <>
            <PageSEO
                title={merchant?.name ? `${merchant.name}` : 'Store'}
                description={merchant?.name ? `Browse and order from ${merchant.name} on Muncheez. Fast delivery across Nairobi.` : 'Store on Muncheez.'}
                path={`/stores/${id}`}
            />
            <SupermarketStore merchant={merchant} products={merchantProducts} />
        </>
    );
}
