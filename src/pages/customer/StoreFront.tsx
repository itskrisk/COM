import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SupermarketStore from './store-types/SupermarketStore';
import { publicApi } from '../../lib/api';
import PageSEO from '../../components/SEO';

export default function StoreFront() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [merchant, setMerchant] = useState<any>(null);
    const [merchantProducts, setMerchantProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Load store data from Supabase
    useEffect(() => {
        loadStore();
    }, [id]);

    const loadStore = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const storeResult = await publicApi.getStore(id);
            if (storeResult.data) {
                setMerchant(storeResult.data);
            }
            // No fallback mock — if store not found, merchant stays null and we show error state

            const productsResult = await publicApi.getStoreProducts(id);
            if (productsResult.data && productsResult.data.length > 0) {
                // Normalize snake_case DB fields → camelCase expected by SupermarketStore.tsx
                setMerchantProducts(productsResult.data.map((p: any) => {
                    const resolvedCategory = p.category?.name || p.category || (Array.isArray(p.tags) && p.tags[0]) || (p.metadata?.tags && p.metadata.tags[0]) || 'Food Cupboard';
                    return {
                        id: p.id,
                        name: p.name,
                        description: p.description || '',
                        categoryId: resolvedCategory,
                        category: resolvedCategory,
                        price: Number(p.price) || 0,
                        oldPrice: p.compare_price ? Number(p.compare_price) : null,
                        promo: Boolean(p.is_featured),
                        isFeatured: Boolean(p.is_featured),
                        stockLevel: p.stock_level ?? 50,
                        isAvailable: p.is_available ?? true,
                        imageUrl: p.image_url || p.imageUrl || '',
                        unit: p.unit || p.metadata?.unit || 'unit',
                        sku: p.sku || `SKU-${p.id?.slice(-4)?.toUpperCase() || '0000'}`,
                    };
                }));
            } else {
                setMerchantProducts([]);
            }
        } catch (err) {
            console.error('Error loading store:', err);
            setMerchantProducts([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
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
