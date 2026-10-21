import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Package,
    Plus,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Tag,
    Store,
    ArrowRight,
    X,
    ChevronRight,
    Boxes,
    Layers,
    TrendingUp
} from 'lucide-react';
import { adminSupabase } from '../../lib/adminSupabase';
import { Product } from '../../types/schema';

export default function Inventory() {
    const [products, setProducts] = useState<any[]>([]);
    const [merchants, setMerchants] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [{ data: merchantData }, { data: productData }] = await Promise.all([
                    adminSupabase.from('merchants').select('id, business_name, store_type, is_approved').order('created_at', { ascending: false }),
                    adminSupabase.from('products').select('*, merchants!merchant_id(business_name)').order('created_at', { ascending: false })
                ]);
                if (merchantData) {
                    setMerchants(merchantData.map((m: any) => ({
                        id: m.id,
                        businessName: m.business_name || 'Partner',
                    })));
                }
                if (productData) {
                    setProducts(productData.map((p: any) => ({
                        ...p,
                        merchantId: p.merchant_id,
                        stockLevel: p.stock_level ?? 50,
                        merchantName: p.merchants?.business_name || 'Unknown Store'
                    })));
                }
            } catch (err) {
                console.error('Inventory fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();

        const channel = adminSupabase.channel('admin_inventory_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
            .subscribe();
        return () => { adminSupabase.removeChannel(channel); };
    }, []);
    const [searchQuery, setSearchQuery] = useState('');
    const [merchantFilter, setMerchantFilter] = useState<string>('ALL');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMerchant = merchantFilter === 'ALL' || product.merchantId === merchantFilter;
        return matchesSearch && matchesMerchant;
    });

    const stats = {
        total: products.length,
        outOfStock: products.filter(p => (p.stockLevel || 0) <= 5).length,
        totalValue: products.reduce((acc, p) => acc + (p.price * (p.stockLevel || 50)), 0),
        merchants: merchants.length
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
                    <p className="text-sm text-gray-400 font-medium">Catalog & stock across partners</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
                        <Layers size={16} /> Bulk Upload
                    </button>
                    <button className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2">
                        <Plus size={16} /> Add Product
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InventoryStat label="Total SKUs" value={stats.total.toString()} icon={Package} color="black" />
                <InventoryStat label="Low Stock" value={stats.outOfStock.toString()} icon={AlertTriangle} color="red" />
                <InventoryStat label="Asset Value" value={`KES ${(stats.totalValue / 1000).toFixed(1)}K`} icon={TrendingUp} color="emerald" />
                <InventoryStat label="Partners" value={stats.merchants.toString()} icon={Store} color="blue" />
            </div>

            {/* Catalog Management */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input
                            type="text"
                            placeholder="Find products by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-gray-200 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <select
                            value={merchantFilter}
                            onChange={(e) => setMerchantFilter(e.target.value)}
                            className="bg-white px-4 py-2.5 rounded-xl text-sm border border-gray-200 outline-none"
                        >
                            <option value="ALL">All Partners</option>
                            {merchants.map(m => (
                                <option key={m.id} value={m.id}>{m.businessName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            merchant={merchants.find(m => m.id === product.merchantId)}
                            onClick={() => setSelectedProduct(product)}
                        />
                    ))}
                </div>
            </div>

            {/* Product Details Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
                    <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden flex flex-col">
                        <div className="h-48 bg-gray-50 relative">
                            {selectedProduct.imageUrl ? (
                                <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Package size={48} />
                                </div>
                            )}
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-lg text-gray-700 hover:bg-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div>
                                <div className="flex items-start justify-between mb-1">
                                    <h2 className="text-lg font-semibold">{selectedProduct.name}</h2>
                                    <p className="text-lg font-semibold">KES {selectedProduct.price.toLocaleString()}</p>
                                </div>
                                <p className="text-sm text-gray-500">{selectedProduct.description || 'No description'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 border border-gray-100 rounded-lg">
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Status</p>
                                    <p className="text-sm">{selectedProduct.isAvailable ? 'Available' : 'Unavailable'}</p>
                                </div>
                                <div className="p-3 border border-gray-100 rounded-lg">
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Stock</p>
                                    <p className="text-sm">{selectedProduct.stockLevel || 0} units</p>
                                </div>
                            </div>
                            <div className="p-3 border border-gray-100 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Merchant</p>
                                    <p className="text-sm">{merchants.find(m => m.id === selectedProduct.merchantId)?.businessName || 'Unknown'}</p>
                                </div>
                                <Store size={18} className="text-gray-400" />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex gap-2">
                            <button className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">Edit</button>
                            <button className="flex-1 px-3 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors">Sync Inventory</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InventoryStat({ label, value, icon: Icon, color }: any) {
    const colors: any = {
        black: 'bg-black/10 text-black',
        red: 'bg-red-50 text-red-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600'
    };

    return (
        <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-xl font-bold text-black tracking-tight">{value}</p>
            </div>
            <div className={`p-2 rounded-lg border ${colors[color]}`}>
                <Icon size={18} />
            </div>
        </div>
    );
}

function ProductCard({ product, merchant, onClick }: { product: Product, merchant?: any, onClick: () => void }) {
    const isLowStock = (product.stockLevel || 0) <= 10;

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all cursor-pointer overflow-hidden"
        >
            <div className="h-40 bg-gray-50 relative">
                {product.imageUrl ? (
                    <img src={product.imageUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package size={32} />
                    </div>
                )}
                {product.isAvailable ? (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-semibold rounded-full border border-green-100">Available</span>
                ) : (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-semibold rounded-full border border-red-100">Unavailable</span>
                )}
            </div>
            <div className="p-4">
                <p className="text-xs text-gray-500 mb-1">{product.categoryId || 'General'}</p>
                <h3 className="text-sm font-medium mb-1 truncate">{product.name}</h3>
                <p className="text-xs text-gray-400 mb-3 truncate">{merchant?.businessName || 'Merchant'}</p>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">KES {product.price.toLocaleString()}</p>
                    <p className={`text-xs ${isLowStock ? 'text-red-600' : 'text-gray-500'}`}>{product.stockLevel || 0} left</p>
                </div>
            </div>
        </div>
    );
}
