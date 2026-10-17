import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ShoppingBag,
    ArrowRight,
    MapPin,
    CreditCard,
    Smartphone,
    Banknote,
    Plus,
    Minus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    LogIn
} from 'lucide-react';
import { customerApi, paymentApi } from '../../lib/api';

export default function CheckoutView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, profile } = useAuth();
    const { items, total, merchantId, clearCart, itemCount, updateQuantity, removeItem } = useCart();

    const [currentStep, setCurrentStep] = useState<'review' | 'delivery' | 'payment'>('review');
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [merchant, setMerchant] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Form States
    const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('muncheez_delivery_address') || '');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cash' | 'card'>('mpesa');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
    const [wantsCutlery, setWantsCutlery] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Prefill profile data
    useEffect(() => {
        if (profile) {
            if (profile.phone && !phoneNumber) setPhoneNumber(profile.phone);
            const savedAddr = (profile as any).addresses?.[0] || (profile as any).address;
            if (savedAddr && !deliveryAddress) {
                setDeliveryAddress(typeof savedAddr === 'string' ? savedAddr : savedAddr.street || savedAddr.city || '');
            }
        }
    }, [profile]);

    // Load merchant data
    useEffect(() => {
        loadMerchant();
    }, [merchantId]);

    const loadMerchant = async () => {
        if (!merchantId) {
            setLoading(false);
            return;
        }
        try {
            const result = await customerApi.getStore(merchantId);
            if (result.data) {
                setMerchant(result.data);
            }
        } catch (e) {
            console.error('Failed to load merchant:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            setErrorMessage('Geolocation is not supported by your browser.');
            return;
        }
        setIsLocating(true);
        setErrorMessage(null);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();
                    if (data && data.display_name) {
                        setDeliveryAddress(data.display_name);
                        localStorage.setItem('muncheez_delivery_address', data.display_name);
                    } else {
                        const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                        setDeliveryAddress(fallback);
                        localStorage.setItem('muncheez_delivery_address', fallback);
                    }
                } catch {
                    const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    setDeliveryAddress(fallback);
                    localStorage.setItem('muncheez_delivery_address', fallback);
                } finally {
                    setIsLocating(false);
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                setIsLocating(false);
                setErrorMessage('Could not fetch GPS location. Please type your delivery address manually.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    if (itemCount === 0 || !merchantId) {
        return (
            <div className="min-h-screen bg-white text-black flex flex-col justify-between selection:bg-black selection:text-white">
                <header className="border-b border-neutral-200 px-4 sm:px-10 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/stores')}
                        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-black transition-colors min-h-[44px]"
                    >
                        <ChevronLeft size={16} />
                        Stores
                    </button>
                    <span className="font-heading font-bold text-2xl tracking-tighter text-black">
                        Muncheez<span className="text-[#D4AF37]">.</span>
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                        Cart (0)
                    </span>
                </header>

                <main className="max-w-xl mx-auto w-full px-4 sm:px-6 py-16 flex-1 flex flex-col justify-center text-center">
                    <div className="w-12 h-12 border border-neutral-200 flex items-center justify-center mx-auto mb-6 text-neutral-400">
                        <ShoppingBag size={22} />
                    </div>

                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2 block">
                        Your Bag · Empty
                    </span>

                    <h1 className="text-3xl sm:text-4xl font-light text-black tracking-tight mb-4">
                        Your bag is currently empty.
                    </h1>

                    <p className="text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed mb-8">
                        Explore supermarkets, eateries, and provisions across Nairobi and add items to your cart.
                    </p>

                    <button
                        onClick={() => navigate('/stores')}
                        className="inline-flex items-center justify-center gap-2 py-3.5 px-6 text-xs font-mono uppercase tracking-widest text-white bg-black hover:bg-neutral-800 transition-colors mx-auto min-h-[44px]"
                    >
                        <span>Browse Catalogues</span>
                        <ArrowRight size={14} />
                    </button>
                </main>

                <footer className="border-t border-neutral-200 py-4 px-4 sm:px-10 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                        Muncheez Delivery · Nairobi, Kenya
                    </p>
                </footer>
            </div>
        );
    }

    const deliveryFee = merchant?.deliveryFee || 150;
    const finalTotal = total + deliveryFee;

    const handlePlaceOrder = async () => {
        setErrorMessage(null);

        // Require user authentication for Supabase RLS compliance
        if (!user) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }

        if (!deliveryAddress.trim()) {
            setCurrentStep('delivery');
            setErrorMessage('Please provide a delivery address before placing your order.');
            return;
        }

        setIsProcessing(true);

        try {
            // Create order via Supabase with validated fields
            const orderResult = await customerApi.createOrder({
                merchantId: merchantId,
                items: items.map(i => ({
                    productId: i.id,
                    name: i.name,
                    quantity: i.quantity,
                    price: i.price,
                    options: []
                })),
                deliveryAddress: deliveryAddress.trim(),
                deliveryInstructions: deliveryInstructions.trim(),
                paymentMethod: paymentMethod.toUpperCase(),
                wantsCutlery: wantsCutlery,
                phoneNumber: phoneNumber.trim()
            });

            if (orderResult.error) {
                setErrorMessage(orderResult.error);
                setIsProcessing(false);
                return;
            }

            const createdOrderId = orderResult.data?.id;
            if (!createdOrderId) {
                setErrorMessage('Order created but failed to retrieve confirmation ID.');
                setIsProcessing(false);
                return;
            }

            // If M-Pesa, attempt payment initiation
            if (paymentMethod === 'mpesa') {
                try {
                    await paymentApi.initiate(createdOrderId);
                } catch (pErr) {
                    console.warn('M-Pesa push notice:', pErr);
                }
            }

            // Clear local and database cart and route to live order status
            clearCart();
            navigate(`/order/${createdOrderId}`);
        } catch (error: any) {
            console.error('Order placement failure:', error);
            setErrorMessage(error?.message || 'Failed to place order. Please try again.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white pb-24">
            {/* Header: Editorial, minimal, edge-to-edge */}
            <header className="border-b border-neutral-200 px-4 sm:px-10 py-3.5 sticky top-0 bg-white/95 backdrop-blur z-30 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-black transition-colors min-h-[44px]"
                    aria-label="Go back"
                >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                </button>
                <div className="text-center">
                    <span className="font-heading font-bold text-xl tracking-tighter block leading-tight">
                        Muncheez<span className="text-[#D4AF37]">.</span>
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block truncate max-w-[200px] sm:max-w-xs">
                        {merchant?.businessName || merchant?.business_name || 'Market Checkout'}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-xs font-mono font-bold text-black block">
                        KES {finalTotal.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                {/* Step indicator: Clean text navigation without overflowing horizontal cards */}
                <nav className="border-b border-neutral-200 pb-3 flex items-center justify-between text-xs font-mono uppercase tracking-widest">
                    {(['review', 'delivery', 'payment'] as const).map((step, idx) => {
                        const isActive = currentStep === step;
                        const isPast = (step === 'delivery' && currentStep === 'payment') || (step === 'review' && currentStep !== 'review');
                        const labels = { review: '1. Review', delivery: '2. Delivery', payment: '3. Payment' };
                        return (
                            <button
                                key={step}
                                onClick={() => setCurrentStep(step)}
                                className={`py-1.5 transition-colors min-h-[36px] flex items-center gap-1.5 ${
                                    isActive
                                        ? 'text-black font-bold border-b-2 border-black -mb-[13px]'
                                        : isPast
                                        ? 'text-neutral-500 hover:text-black'
                                        : 'text-neutral-300 hover:text-neutral-500'
                                }`}
                            >
                                {isPast && <CheckCircle2 size={12} className="text-emerald-600" />}
                                <span>{labels[step]}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Inline Error Banner */}
                {errorMessage && (
                    <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-xs font-mono flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div className="flex-1 leading-relaxed">{errorMessage}</div>
                    </div>
                )}

                {/* Unauthenticated Customer Notice */}
                {!user && (
                    <div className="border border-amber-200 bg-amber-50/60 p-4 text-xs font-mono text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <LogIn size={15} className="shrink-0" />
                            <span>You are checking out as guest. Sign in to track live delivery.</span>
                        </div>
                        <button
                            onClick={() => navigate('/login', { state: { from: location.pathname } })}
                            className="underline uppercase font-bold tracking-widest text-black hover:text-neutral-700 text-left sm:text-right"
                        >
                            Sign In / Register →
                        </button>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* ═══ STEP 1: REVIEW & EDIT BAG ═══ */}
                    {currentStep === 'review' && (
                        <motion.section
                            key="review"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div>
                                <h1 className="text-xl sm:text-2xl font-light tracking-tight text-black mb-1">
                                    Review Your Items
                                </h1>
                                <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                                    Direct from {merchant?.businessName || merchant?.business_name || 'Market'}
                                </p>
                            </div>

                            {/* Item List: Unboxed editorial list with hairline dividers */}
                            <div className="border-t border-b border-neutral-200 divide-y divide-neutral-100">
                                {items.map((item) => (
                                    <div key={item.id} className="py-3.5 flex items-center gap-3">
                                        {/* Image */}
                                        <div className="w-14 h-14 border border-neutral-200 bg-neutral-100 overflow-hidden shrink-0">
                                            <img
                                                src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Name & Price */}
                                        <div className="flex-1 min-w-0 pr-1">
                                            <h2 className="text-sm font-medium text-black truncate leading-snug">
                                                {item.name}
                                            </h2>
                                            <p className="text-xs font-mono text-neutral-500">
                                                KES {item.price.toLocaleString()}
                                            </p>
                                        </div>

                                        {/* Quantity Controls: Generous touch targets */}
                                        <div className="flex items-center gap-1 border border-neutral-300 px-1 py-0.5 shrink-0 bg-white">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:text-black transition-colors"
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="text-xs font-mono font-bold min-w-[20px] text-center">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:text-black transition-colors"
                                                aria-label="Increase quantity"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>

                                        {/* Direct Remove */}
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="p-2 text-neutral-400 hover:text-rose-600 transition-colors shrink-0"
                                            aria-label={`Remove ${item.name}`}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Cutlery Toggle: Unboxed border divider */}
                            {merchant?.type === 'Restaurant' && (
                                <div className="border-b border-neutral-200 pb-4 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-mono uppercase tracking-widest text-black block">
                                            Cutlery & Utensils
                                        </span>
                                        <span className="text-[11px] text-neutral-400 block">
                                            Request disposable cutlery with your meal
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={wantsCutlery}
                                        onChange={(e) => setWantsCutlery(e.target.checked)}
                                        className="w-4 h-4 accent-black cursor-pointer"
                                    />
                                </div>
                            )}

                            {/* Subtotal Preview */}
                            <div className="border-b border-neutral-200 pb-4 space-y-1.5 text-xs font-mono">
                                <div className="flex justify-between text-neutral-500">
                                    <span className="uppercase tracking-widest">Subtotal ({itemCount} items)</span>
                                    <span>KES {total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-neutral-500">
                                    <span className="uppercase tracking-widest">Delivery Standard</span>
                                    <span>KES {deliveryFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-black font-bold pt-1 text-sm">
                                    <span className="uppercase tracking-widest">Estimated Total</span>
                                    <span>KES {finalTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setCurrentStep('delivery')}
                                className="w-full bg-black hover:bg-neutral-800 text-white font-mono uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-2 transition-colors min-h-[48px]"
                            >
                                <span>Continue to Delivery Details</span>
                                <ArrowRight size={14} />
                            </button>
                        </motion.section>
                    )}

                    {/* ═══ STEP 2: DELIVERY DETAILS ═══ */}
                    {currentStep === 'delivery' && (
                        <motion.section
                            key="delivery"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div>
                                <h1 className="text-xl sm:text-2xl font-light tracking-tight text-black mb-1">
                                    Delivery Address
                                </h1>
                                <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                                    Dispatched by courier fleet
                                </p>
                            </div>

                            <div className="border-t border-neutral-200 pt-4 space-y-6">
                                {/* Address Input: Transparent bottom-line input */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                            Street Address, Building & Unit *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleGetCurrentLocation}
                                            disabled={isLocating}
                                            className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 hover:text-black underline flex items-center gap-1"
                                        >
                                            <MapPin size={11} />
                                            {isLocating ? 'Locating...' : 'Use My GPS'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={deliveryAddress}
                                        onChange={(e) => {
                                            setDeliveryAddress(e.target.value);
                                            localStorage.setItem('muncheez_delivery_address', e.target.value);
                                        }}
                                        placeholder="e.g. Westlands, Mpaka Road, The Mirage, Tower 2, Apt 4B"
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-sans"
                                    />
                                    <span className="text-[10px] font-mono text-neutral-400 block">
                                        Both the merchant packing team and dispatch rider will receive this exact destination.
                                    </span>
                                </div>

                                {/* Delivery Instructions: Clean textarea */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                        Drop-off Notes / Instructions (Optional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={deliveryInstructions}
                                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                                        placeholder="e.g. Ring the bell on arrival, leave at security desk, call upon reaching the gate..."
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-sans resize-none"
                                    />
                                </div>

                                {/* Phone Number: Transparent bottom-line input */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                        Recipient Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="07XX XXX XXX or +254 7XX XXX XXX"
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                    <span className="text-[10px] font-mono text-neutral-400 block">
                                        Used for delivery SMS updates and M-Pesa push prompts.
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep('review')}
                                    className="px-5 py-4 border border-neutral-300 hover:border-black text-xs font-mono uppercase tracking-widest transition-colors min-h-[48px]"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!deliveryAddress.trim()) {
                                            setErrorMessage('Please specify your delivery address before proceeding.');
                                            return;
                                        }
                                        setErrorMessage(null);
                                        setCurrentStep('payment');
                                    }}
                                    className="flex-1 bg-black hover:bg-neutral-800 text-white font-mono uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-2 transition-colors min-h-[48px]"
                                >
                                    <span>Continue to Payment</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </motion.section>
                    )}

                    {/* ═══ STEP 3: PAYMENT METHOD & CONFIRMATION ═══ */}
                    {currentStep === 'payment' && (
                        <motion.section
                            key="payment"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div>
                                <h1 className="text-xl sm:text-2xl font-light tracking-tight text-black mb-1">
                                    Select Payment Method
                                </h1>
                                <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                                    Secure checkout · Instant confirmation
                                </p>
                            </div>

                            {/* Payment Options: Edge-to-edge unboxed layout with radio indicators */}
                            <div className="border-t border-b border-neutral-200 divide-y divide-neutral-100">
                                {/* M-Pesa Option */}
                                <label className="py-4 flex items-center justify-between cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <Smartphone size={18} className={paymentMethod === 'mpesa' ? 'text-emerald-600' : 'text-neutral-400'} />
                                        <div>
                                            <span className="text-sm font-medium text-black block">
                                                M-Pesa Express (STK Push)
                                            </span>
                                            <span className="text-[11px] font-mono text-neutral-400 block">
                                                Prompt sent to {phoneNumber || 'your registered phone'}
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="mpesa"
                                        checked={paymentMethod === 'mpesa'}
                                        onChange={() => setPaymentMethod('mpesa')}
                                        className="w-4 h-4 accent-black cursor-pointer"
                                    />
                                </label>

                                {/* Cash Option */}
                                <label className="py-4 flex items-center justify-between cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <Banknote size={18} className={paymentMethod === 'cash' ? 'text-black' : 'text-neutral-400'} />
                                        <div>
                                            <span className="text-sm font-medium text-black block">
                                                Cash on Delivery
                                            </span>
                                            <span className="text-[11px] font-mono text-neutral-400 block">
                                                Pay courier upon receiving your package
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="cash"
                                        checked={paymentMethod === 'cash'}
                                        onChange={() => setPaymentMethod('cash')}
                                        className="w-4 h-4 accent-black cursor-pointer"
                                    />
                                </label>

                                {/* Card Option */}
                                <label className="py-4 flex items-center justify-between cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <CreditCard size={18} className={paymentMethod === 'card' ? 'text-black' : 'text-neutral-400'} />
                                        <div>
                                            <span className="text-sm font-medium text-black block">
                                                Card / Visa / Mastercard
                                            </span>
                                            <span className="text-[11px] font-mono text-neutral-400 block">
                                                Online card gateway checkout
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="card"
                                        checked={paymentMethod === 'card'}
                                        onChange={() => setPaymentMethod('card')}
                                        className="w-4 h-4 accent-black cursor-pointer"
                                    />
                                </label>
                            </div>

                            {/* Summary Breakdown */}
                            <div className="border-b border-neutral-200 pb-4 space-y-2 text-xs font-mono">
                                <div className="flex justify-between text-neutral-500">
                                    <span className="uppercase tracking-widest">Basket Subtotal</span>
                                    <span>KES {total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-neutral-500">
                                    <span className="uppercase tracking-widest">Courier Delivery</span>
                                    <span>KES {deliveryFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-black font-bold pt-2 border-t border-neutral-100 text-base">
                                    <span className="uppercase tracking-widest">Total Payable</span>
                                    <span>KES {finalTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Destination summary line */}
                            <div className="text-[11px] font-mono text-neutral-500 flex items-start gap-1.5">
                                <MapPin size={13} className="shrink-0 mt-0.5 text-neutral-400" />
                                <span className="truncate">Delivering to: {deliveryAddress || 'Address required'}</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => setCurrentStep('delivery')}
                                    className="px-5 py-4 border border-neutral-300 hover:border-black text-xs font-mono uppercase tracking-widest transition-colors min-h-[48px]"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={handlePlaceOrder}
                                    className="flex-1 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-mono uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-2 transition-colors min-h-[48px]"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            <span>Placing Order in Supabase...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Confirm & Place Order</span>
                                            <ArrowRight size={14} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
