import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SupermarketStore from './store-types/SupermarketStore';
import { publicApi } from '../../lib/api';

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
                setMerchantProducts(productsResult.data);
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
                <button onClick={() => navigate('/c/stores?v=market')} className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl">
                    Back to Market
                </button>
            </div>
        );
    }

    // Platform is dedicated to supermarkets
    return <SupermarketStore merchant={merchant} products={merchantProducts} />;
}
