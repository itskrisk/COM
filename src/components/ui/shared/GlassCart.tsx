import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '../../../context/CartContext';

interface GlassCartProps {
    merchant?: any;
}

const GlassCart: React.FC<GlassCartProps> = ({ merchant }) => {
    const navigate = useNavigate();
    const { items, itemCount, total, updateQuantity, removeItem, clearCart } = useCart();
    const [isExpanded, setIsExpanded] = useState(false);
    const [wantsCutlery, setWantsCutlery] = useState(false);

    // Listen to custom event to open cart from header or other components
    useEffect(() => {
        const handleOpenCart = () => setIsExpanded(true);
        window.addEventListener('open-glass-cart', handleOpenCart);
        return () => window.removeEventListener('open-glass-cart', handleOpenCart);
    }, []);

    if (itemCount === 0) return null;

    const isRestaurant = merchant?.type === 'Restaurant';
    const showCutleryToggle = isRestaurant && merchant?.customSettings?.cutleryRequired;

    return (
        <div className="fixed bottom-4 sm:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 z-[500] pointer-events-none w-full max-w-lg px-3 sm:px-4">
            <motion.div
                layout
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`
                    pointer-events-auto mx-auto
                    bg-neutral-950/95 backdrop-blur-2xl border border-white/15 text-white
                    overflow-hidden transition-all duration-300 shadow-2xl
                    ${isExpanded ? 'w-full' : 'w-auto inline-block'}
                `}
            >
                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        <motion.button
                            key="collapsed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsExpanded(true)}
                            className="flex items-center gap-3.5 px-5 py-3.5 whitespace-nowrap group hover:bg-white/5 transition-colors"
                            aria-label={`Open shopping cart with ${itemCount} items`}
                        >
                            <div className="relative">
                                <ShoppingBag size={18} className="text-[#D4AF37] group-hover:scale-105 transition-transform" />
                                <span className="absolute -top-2 -right-2.5 bg-[#D4AF37] text-black text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {itemCount}
                                </span>
                            </div>
                            <div className="flex flex-col items-start text-left">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 leading-none mb-0.5">Your Cart</span>
                                <span className="text-xs font-mono font-bold text-white leading-none">KES {total.toLocaleString()}</span>
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4AF37] ml-2 underline underline-offset-2">View</span>
                        </motion.button>
                    ) : (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col max-h-[85vh] sm:max-h-[80vh]"
                        >
                            {/* Header: Unboxed editorial title */}
                            <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <ShoppingBag size={18} className="text-[#D4AF37]" />
                                    <div>
                                        <h2 className="text-sm sm:text-base font-heading font-bold tracking-tight text-white uppercase">Your Basket</h2>
                                        <p className="text-[10px] font-mono text-neutral-400 tracking-wider">
                                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                                    aria-label="Close cart drawer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Items List: Clean unboxed layout with edge-to-edge dividers */}
                            <div className="flex-1 overflow-y-auto divide-y divide-white/10 px-4 sm:px-6 py-1">
                                {items.map((item) => (
                                    <div key={item.id} className="py-3.5 flex items-center gap-3">
                                        {/* Thumbnail */}
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 border border-white/10 bg-neutral-900 overflow-hidden shrink-0">
                                            <img
                                                src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Product Details */}
                                        <div className="flex-1 min-w-0 pr-1">
                                            <h3 className="text-xs sm:text-sm font-medium text-white truncate mb-0.5 leading-snug">
                                                {item.name}
                                            </h3>
                                            <p className="text-[11px] font-mono text-[#D4AF37]">
                                                KES {item.price.toLocaleString()}
                                            </p>
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-1.5 shrink-0 border border-white/20 bg-black/40 px-1 py-0.5">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="w-6 h-6 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="text-xs font-mono font-bold text-white min-w-[18px] text-center">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="w-6 h-6 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                                                aria-label="Increase quantity"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>

                                        {/* Direct Remove Action */}
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors shrink-0"
                                            aria-label={`Remove ${item.name}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Footer / Summary / Checkout */}
                            <div className="p-4 sm:p-6 border-t border-white/10 space-y-4 bg-neutral-950/80">
                                {showCutleryToggle && (
                                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                        <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-300">
                                            Include Cutlery
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={wantsCutlery}
                                            onChange={(e) => setWantsCutlery(e.target.checked)}
                                            className="w-4 h-4 accent-[#D4AF37]"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-xs font-mono">
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Clear all items from your bag?')) clearCart();
                                        }}
                                        className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-rose-400 transition-colors inline-flex items-center gap-1"
                                    >
                                        <Trash2 size={12} /> Clear Bag
                                    </button>
                                    <div className="text-right">
                                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 mr-2">Total</span>
                                        <span className="text-base sm:text-lg font-bold text-white">KES {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/checkout')}
                                    className="w-full bg-[#D4AF37] hover:bg-[#c49f2f] text-black font-mono uppercase tracking-widest text-xs font-bold py-3.5 flex items-center justify-center gap-2 transition-colors"
                                >
                                    Proceed to Checkout
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default GlassCart;
