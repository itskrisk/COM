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
    Wallet,
    Plus,
    Minus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    LogIn,
    Loader2,
    RefreshCw,
    X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { customerApi } from '../../lib/api';
import { mpesaService } from '../../lib/mpesaService';
import { walletService } from '../../lib/walletService';

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

    // Derive effective merchant ID across state, cart item props, and storage
    const effectiveMerchantId =
        merchantId ||
        items[0]?.merchantId ||
        (items[0] as any)?.merchant_id ||
        localStorage.getItem('muncheez_cart_merchantId') ||
        localStorage.getItem('activeMerchantId') ||
        '11949575-b1f4-43e1-a256-8561eaf234b4';

    // Form States
    const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('muncheez_delivery_address') || '');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cash' | 'card' | 'wallet'>('mpesa');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
    const [wantsCutlery, setWantsCutlery] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Real M-Pesa STK Push Express States (No simulation)
    const [isStkModalOpen, setIsStkModalOpen] = useState(false);
    const [stkOrderId, setStkOrderId] = useState<string | null>(null);
    const [stkCheckoutRequestId, setStkCheckoutRequestId] = useState<string>('');
    const [stkReceiptNumber, setStkReceiptNumber] = useState<string>('');
    const [stkStatus, setStkStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED'>('PENDING');
    const [stkErrorMessage, setStkErrorMessage] = useState<string>('');
    const [isRetryingStk, setIsRetryingStk] = useState(false);
    // Expiry window supplied by server after STK push (ISO string, 10 min from push time)
    const [stkExpiresAt, setStkExpiresAt] = useState<string | null>(null);
    const [stkCountdown, setStkCountdown] = useState<number>(600); // seconds

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
    }, [effectiveMerchantId]);

    const loadMerchant = async () => {
        if (!effectiveMerchantId) {
            setLoading(false);
            return;
        }
        try {
            const result = await customerApi.getStore(effectiveMerchantId);
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

    const hasCartItems = items.length > 0 || itemCount > 0;
    if (!hasCartItems) {
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

    // Countdown timer derived from server-set payment_expires_at
    useEffect(() => {
        if (!isStkModalOpen || !stkExpiresAt || stkStatus !== 'PENDING') return;
        const tick = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((new Date(stkExpiresAt).getTime() - Date.now()) / 1000));
            setStkCountdown(remaining);
            if (remaining === 0) clearInterval(tick);
        }, 1000);
        return () => clearInterval(tick);
    }, [isStkModalOpen, stkExpiresAt, stkStatus]);

    // Real Safaricom M-Pesa STK Push Network Listener & Poller (No Simulation)
    useEffect(() => {
        if (!isStkModalOpen || !stkOrderId) return;

        let isMounted = true;
        let pollTimer: any = null;

        // 1. Listen for real callback confirmation via Supabase Realtime
        const channel = supabase
            .channel(`mpesa_tx_${stkOrderId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'mpesa_transactions',
                    filter: `order_id=eq.${stkOrderId}`
                },
                (payload: any) => {
                    const row = payload.new;
                    if (row && isMounted) {
                        if (row.status === 'SUCCESS') {
                            setStkStatus('SUCCESS');
                            if (row.mpesa_receipt_number) setStkReceiptNumber(row.mpesa_receipt_number);
                            setTimeout(() => {
                                clearCart();
                                navigate(`/order/${stkOrderId}`);
                            }, 1800);
                        } else if (row.status === 'FAILED') {
                            setStkStatus('FAILED');
                            setStkErrorMessage(row.result_desc || 'Payment was cancelled or failed.');
                        }
                    }
                }
            )
            .subscribe();

        // 2. Poll Safaricom query endpoint every 3 seconds
        let attempts = 0;
        const maxAttempts = 35; // ~100s timeout matches Safaricom PIN prompt lifecycle

        const pollStatus = async () => {
            if (!isMounted || attempts >= maxAttempts) {
                if (attempts >= maxAttempts && isMounted && stkStatus === 'PENDING') {
                    setStkStatus('FAILED');
                    setStkErrorMessage('M-Pesa authorization timed out. Please check your phone or retry.');
                    // Write the expiry to DB so order is not left dangling as PENDING
                    if (stkOrderId) {
                        supabase
                            .from('orders')
                            .update({ payment_status: 'EXPIRED', updated_at: new Date().toISOString() })
                            .eq('id', stkOrderId)
                            .neq('payment_status', 'PAID')
                            .then();
                    }
                }
                return;
            }
            attempts++;

            try {
                const res = await mpesaService.queryStatus(stkCheckoutRequestId, stkOrderId || '');
                if (!isMounted) return;

                if (res.isComplete) {
                    if (res.status === 'SUCCESS') {
                        setStkStatus('SUCCESS');
                        if (res.receiptNumber) setStkReceiptNumber(res.receiptNumber);
                        setTimeout(() => {
                            clearCart();
                            navigate(`/order/${stkOrderId}`);
                        }, 1800);
                        return;
                    } else if (res.status === 'FAILED') {
                        setStkStatus('FAILED');
                        setStkErrorMessage(res.resultDesc || 'M-Pesa prompt cancelled or declined.');
                        return;
                    }
                }
            } catch (e) {
                console.error('Polling error:', e);
            }

            if (isMounted && stkStatus === 'PENDING') {
                pollTimer = setTimeout(pollStatus, 3000);
            }
        };

        pollTimer = setTimeout(pollStatus, 2500);

        return () => {
            isMounted = false;
            if (pollTimer) clearTimeout(pollTimer);
            supabase.removeChannel(channel);
        };
    }, [isStkModalOpen, stkOrderId, stkCheckoutRequestId]);

    const handleRetryStkPush = async () => {
        if (!stkOrderId || isRetryingStk) return;
        setIsRetryingStk(true);
        setStkStatus('PENDING');
        setStkErrorMessage('');

        try {
            const stkRes = await mpesaService.initiateSTKPush({
                phoneNumber: phoneNumber.trim(),
                amount: finalTotal,
                orderId: stkOrderId,
                merchantId: effectiveMerchantId
            });

            if (stkRes.success && stkRes.checkoutRequestId) {
                setStkCheckoutRequestId(stkRes.checkoutRequestId);
            } else {
                setStkStatus('FAILED');
                setStkErrorMessage(stkRes.error || 'Failed to resend M-Pesa prompt.');
            }
        } catch (e: any) {
            setStkStatus('FAILED');
            setStkErrorMessage(e.message || 'Error communicating with M-Pesa.');
        } finally {
            setIsRetryingStk(false);
        }
    };

    const handlePlaceOrder = async () => {
        setErrorMessage(null);

        if (!deliveryAddress.trim()) {
            setCurrentStep('delivery');
            setErrorMessage('Please provide a delivery address before placing your order.');
            return;
        }

        if (!phoneNumber.trim()) {
            setCurrentStep('delivery');
            setErrorMessage('Please provide a recipient phone number for delivery updates.');
            return;
        }

        setIsProcessing(true);

        try {
            // Create order via Supabase with validated fields
            const orderResult = await customerApi.createOrder({
                merchantId: effectiveMerchantId,
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

            // Store last order for immediate retrieval
            localStorage.setItem('muncheez_last_order', createdOrderId);

            // If wallet payment, debit customer wallet
            if (paymentMethod === 'wallet') {
                const ok = await walletService.debitWallet(user!.id, finalTotal, createdOrderId, `WLT-${Date.now()}`);
                if (!ok) {
                    setErrorMessage('Insufficient wallet balance. Please top up or choose another method.');
                    setIsProcessing(false);
                    return;
                }
            }

            // If M-Pesa, dispatch STK Push via Daraja API and open modal
            if (paymentMethod === 'mpesa') {
                const stkRes = await mpesaService.initiateSTKPush({
                    phoneNumber: phoneNumber.trim(),
                    amount: finalTotal,
                    orderId: createdOrderId,
                    merchantId: effectiveMerchantId
                });

                setIsProcessing(false);

                if (!stkRes.success) {
                    setErrorMessage(stkRes.error || 'Failed to dispatch M-Pesa prompt. Please verify your phone number.');
                    return;
                }

                setStkOrderId(createdOrderId);
                setStkCheckoutRequestId(stkRes.checkoutRequestId || '');
                setStkReceiptNumber(stkRes.receiptNumber || '');
                setStkStatus('PENDING');
                // Store server-issued expiry (10 min window set by stkpush.js)
                const expiresAt = (stkRes as any).expiresAt || null;
                setStkExpiresAt(expiresAt);
                setStkCountdown(expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)) : 600);
                setIsStkModalOpen(true);
                return;
            }

            // Cash / Card: navigate directly to order tracking.
            // Wallet allocation happens ONLY after merchant confirms delivery
            // (not at checkout time) to preserve payment integrity.
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
            {/* Header: Editorial, minimal, edge-to-edge with mobile responsiveness */}
            <header className="border-b border-neutral-200 px-3 sm:px-8 py-3 sticky top-0 bg-white/95 backdrop-blur z-30 flex items-center justify-between gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono uppercase tracking-wider sm:tracking-widest text-neutral-500 hover:text-black transition-colors min-h-[40px] shrink-0"
                    aria-label="Go back"
                >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                </button>
                <div className="text-center min-w-0 flex-1 px-1">
                    <span className="font-heading font-bold text-lg sm:text-xl tracking-tighter block leading-tight">
                        Muncheez<span className="text-[#D4AF37]">.</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono text-neutral-400 uppercase tracking-widest block truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs mx-auto">
                        {merchant?.businessName || merchant?.business_name || 'Market Checkout'}
                    </span>
                </div>
                <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-black block whitespace-nowrap">
                        KES {finalTotal.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block whitespace-nowrap">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto w-full px-3.5 sm:px-6 py-5 sm:py-8 space-y-6">
                {/* Step indicator: Clean, unboxed text navigation that never wraps awkwardly on mobile */}
                <nav className="border-b border-neutral-200 flex items-center justify-between text-[10px] sm:text-xs font-mono uppercase tracking-wider sm:tracking-widest">
                    {(['review', 'delivery', 'payment'] as const).map((step) => {
                        const isActive = currentStep === step;
                        const isPast = (step === 'delivery' && currentStep === 'payment') || (step === 'review' && currentStep !== 'review');
                        const labels = { review: '1. Review', delivery: '2. Delivery', payment: '3. Payment' };
                        return (
                            <button
                                key={step}
                                onClick={() => setCurrentStep(step)}
                                className={`py-2.5 sm:py-3 transition-colors min-h-[40px] flex items-center justify-center gap-1 sm:gap-1.5 relative flex-1 text-center ${
                                    isActive
                                        ? 'text-black font-bold border-b-2 border-black -mb-px'
                                        : isPast
                                        ? 'text-neutral-500 hover:text-black border-b-2 border-transparent -mb-px'
                                        : 'text-neutral-300 hover:text-neutral-500 border-b-2 border-transparent -mb-px'
                                }`}
                            >
                                {isPast && <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />}
                                <span className="truncate">{labels[step]}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Inline Error Banner */}
                {errorMessage && (
                    <div className="border border-red-200 bg-red-50 text-red-700 px-3.5 py-3 text-xs font-mono flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div className="flex-1 leading-relaxed">{errorMessage}</div>
                    </div>
                )}

                {/* Unauthenticated Customer Notice */}
                {!user && (
                    <div className="border border-amber-200 bg-amber-50/60 p-3.5 sm:p-4 text-xs font-mono text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                                <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest truncate">
                                    Direct from {merchant?.businessName || merchant?.business_name || 'Market'}
                                </p>
                            </div>

                            {/* Item List: Unboxed editorial list with hairline dividers, mobile-first */}
                            <div className="border-t border-b border-neutral-200 divide-y divide-neutral-100">
                                {items.map((item) => (
                                    <div key={item.id} className="py-3 sm:py-3.5 flex items-start sm:items-center gap-3">
                                        {/* Image */}
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 border border-neutral-200 bg-neutral-100 overflow-hidden shrink-0 mt-0.5 sm:mt-0">
                                            <img
                                                src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Name, Price, and Controls: Mobile wrap handled elegantly */}
                                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="min-w-0 pr-1">
                                                <h2 className="text-xs sm:text-sm font-medium text-black line-clamp-2 leading-snug">
                                                    {item.name}
                                                </h2>
                                                <p className="text-[11px] sm:text-xs font-mono text-neutral-500 mt-0.5">
                                                    KES {item.price.toLocaleString()}
                                                </p>
                                            </div>

                                            {/* Quantity Controls & Remove Action */}
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                <div className="flex items-center border border-neutral-300 px-0.5 py-0.5 bg-white">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:text-black transition-colors"
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus size={11} />
                                                    </button>
                                                    <span className="text-xs font-mono font-bold min-w-[22px] text-center">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:text-black transition-colors"
                                                        aria-label="Increase quantity"
                                                    >
                                                        <Plus size={11} />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-rose-600 transition-colors"
                                                    aria-label={`Remove ${item.name}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Cutlery Toggle: Unboxed border divider */}
                            {merchant?.type === 'Restaurant' && (
                                <div className="border-b border-neutral-200 pb-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <span className="text-xs font-mono uppercase tracking-widest text-black block truncate">
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
                                        className="w-4 h-4 accent-black cursor-pointer shrink-0"
                                    />
                                </div>
                            )}

                            {/* Subtotal Preview */}
                            <div className="border-b border-neutral-200 pb-4 space-y-1.5 text-xs font-mono">
                                <div className="flex justify-between text-neutral-500">
                                    <span className="uppercase tracking-wider sm:tracking-widest">Subtotal ({itemCount} items)</span>
                                    <span>KES {total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-neutral-500">
                                    <span className="uppercase tracking-wider sm:tracking-widest">Delivery Standard</span>
                                    <span>KES {deliveryFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-black font-bold pt-1 text-sm sm:text-base">
                                    <span className="uppercase tracking-wider sm:tracking-widest">Estimated Total</span>
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
                                {/* Address Input: Transparent bottom-line input, 16px font on mobile to prevent iOS auto-zoom */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                            Street Address, Building & Unit *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleGetCurrentLocation}
                                            disabled={isLocating}
                                            className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 hover:text-black underline flex items-center gap-1 min-h-[36px] shrink-0"
                                        >
                                            <MapPin size={11} />
                                            <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
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
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-base sm:text-sm text-black outline-none font-sans"
                                    />
                                    <span className="text-[10px] font-mono text-neutral-400 block leading-relaxed">
                                        Both the merchant packing team and dispatch rider will receive this exact destination.
                                    </span>
                                </div>

                                {/* Delivery Instructions: Clean textarea, 16px mobile font */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                        Drop-off Notes / Instructions (Optional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={deliveryInstructions}
                                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                                        placeholder="e.g. Ring the bell on arrival, leave at security desk, call upon reaching the gate..."
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-base sm:text-sm text-black outline-none font-sans resize-none"
                                    />
                                </div>

                                {/* Phone Number: Transparent bottom-line input, 16px mobile font */}
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
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-base sm:text-sm text-black outline-none font-mono"
                                    />
                                    <span className="text-[10px] font-mono text-neutral-400 block">
                                        Used for delivery SMS updates and M-Pesa push prompts.
                                    </span>
                                </div>
                            </div>

                            {/* Responsive Actions: Primary on top on mobile, secondary below */}
                            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep('review')}
                                    className="w-full sm:w-auto px-6 py-3.5 sm:py-4 border border-neutral-300 hover:border-black text-xs font-mono uppercase tracking-widest transition-colors min-h-[48px]"
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
                                    className="w-full sm:flex-1 bg-black hover:bg-neutral-800 text-white font-mono uppercase tracking-widest text-xs py-3.5 sm:py-4 flex items-center justify-center gap-2 transition-colors min-h-[48px]"
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
                                <label className="py-3.5 sm:py-4 flex items-center justify-between cursor-pointer group gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Smartphone size={18} className={`shrink-0 ${paymentMethod === 'mpesa' ? 'text-emerald-600' : 'text-neutral-400'}`} />
                                        <div className="min-w-0 flex-1">
                                            <span className="text-xs sm:text-sm font-medium text-black block truncate">
                                                M-Pesa Express (STK Push)
                                            </span>
                                            <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 block truncate">
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
                                        className="w-4 h-4 accent-black cursor-pointer shrink-0"
                                    />
                                </label>

                                {/* Cash Option */}
                                <label className="py-3.5 sm:py-4 flex items-center justify-between cursor-pointer group gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Banknote size={18} className={`shrink-0 ${paymentMethod === 'cash' ? 'text-black' : 'text-neutral-400'}`} />
                                        <div className="min-w-0 flex-1">
                                            <span className="text-xs sm:text-sm font-medium text-black block truncate">
                                                Cash on Delivery
                                            </span>
                                            <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 block truncate">
                                                Pay courier upon receiving package
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="cash"
                                        checked={paymentMethod === 'cash'}
                                        onChange={() => setPaymentMethod('cash')}
                                        className="w-4 h-4 accent-black cursor-pointer shrink-0"
                                    />
                                </label>

                                {/* Card Option */}
                                <label className="py-3.5 sm:py-4 flex items-center justify-between cursor-pointer group gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <CreditCard size={18} className={`shrink-0 ${paymentMethod === 'card' ? 'text-black' : 'text-neutral-400'}`} />
                                        <div className="min-w-0 flex-1">
                                                <span className="text-xs sm:text-sm font-medium text-black block truncate">
                                                    Card / Visa / Mastercard
                                                </span>
                                                <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 block truncate">
                                                    Coming soon
                                                </span>
                                        </div>
                                    </div>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="card"
                                        checked={paymentMethod === 'card'}
                                        onChange={() => {}}
                                        disabled
                                        className="w-4 h-4 accent-black cursor-not-allowed shrink-0 opacity-40"
                                    />
                                </label>

                                {/* Wallet Option */}
                                <label className="py-3.5 sm:py-4 flex items-center justify-between cursor-pointer group gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Wallet size={18} className={`shrink-0 ${paymentMethod === 'wallet' ? 'text-[#4A90E2]' : 'text-neutral-400'}`} />
                                        <div className="min-w-0 flex-1">
                                            <span className="text-xs sm:text-sm font-medium text-black block truncate">
                                                Muncheez Wallet
                                            </span>
                                            <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 block truncate">
                                                Pay instantly from your balance
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="wallet"
                                        checked={paymentMethod === 'wallet'}
                                        onChange={() => setPaymentMethod('wallet')}
                                        className="w-4 h-4 accent-black cursor-pointer shrink-0"
                                    />
                                </label>
                            </div>

                            {/* Summary Breakdown */}
                            <div className="border-b border-neutral-200 pb-4 space-y-2 text-xs font-mono">
                                <div className="flex justify-between text-neutral-500">
                                    <span className="uppercase tracking-wider sm:tracking-widest">Basket Subtotal</span>
                                    <span>KES {total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-neutral-500">
                                    <span className="uppercase tracking-wider sm:tracking-widest">Courier Delivery</span>
                                    <span>KES {deliveryFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-black font-bold pt-2 border-t border-neutral-100 text-sm sm:text-base">
                                    <span className="uppercase tracking-wider sm:tracking-widest">Total Payable</span>
                                    <span>KES {finalTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Destination summary line */}
                            <div className="text-[11px] font-mono text-neutral-500 flex items-start gap-1.5">
                                <MapPin size={13} className="shrink-0 mt-0.5 text-neutral-400" />
                                <span className="truncate">Delivering to: {deliveryAddress || 'Address required'}</span>
                            </div>

                            {/* Action Buttons: Responsive stacking on mobile */}
                            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => setCurrentStep('delivery')}
                                    className="w-full sm:w-auto px-6 py-3.5 sm:py-4 border border-neutral-300 hover:border-black text-xs font-mono uppercase tracking-widest transition-colors min-h-[48px]"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={handlePlaceOrder}
                                    className="w-full sm:flex-1 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-mono uppercase tracking-widest text-xs py-3.5 sm:py-4 flex items-center justify-center gap-2 transition-colors min-h-[48px]"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                                            <span className="truncate">Placing Order in Supabase...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Confirm & Place Order</span>
                                            <ArrowRight size={14} className="shrink-0" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>
            </main>

            {/* ═══ REAL SAFARICOM M-PESA DARAJA LIVE MODAL (NO SIMULATION) ═══ */}
            {/* Unboxed editorial modal strictly conforming to NO-CARD rules, 100% mobile responsive */}
            <AnimatePresence>
                {isStkModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="w-full max-w-md bg-white border border-neutral-300 shadow-2xl my-auto overflow-hidden max-h-[92vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="border-b border-neutral-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-2.5 h-2.5 rounded-full ${
                                            stkStatus === 'SUCCESS'
                                                ? 'bg-emerald-500'
                                                : stkStatus === 'FAILED'
                                                ? 'bg-red-500'
                                                : 'bg-emerald-500 animate-ping'
                                        }`}
                                    />
                                    <span className="text-xs font-mono uppercase tracking-widest font-bold text-black">
                                        M-Pesa Express · Daraja Live
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                                    Safaricom STK
                                </span>
                            </div>

                            {/* Modal Body */}
                            <div className="px-4 sm:px-6 py-5 space-y-4 overflow-y-auto flex-1">
                                <div className="border border-neutral-200 p-3 sm:p-4 space-y-2 bg-neutral-50/60 font-mono text-xs">
                                    <div className="flex justify-between text-neutral-500">
                                        <span>Recipient Number</span>
                                        <span className="font-bold text-black">{phoneNumber || '07XX XXX XXX'}</span>
                                    </div>
                                    <div className="flex justify-between text-neutral-500">
                                        <span>Payable Amount</span>
                                        <span className="font-bold text-black">KES {finalTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-neutral-500">
                                        <span>Account Reference</span>
                                        <span className="text-black font-bold">MUNCHEEZ-{stkOrderId?.slice(0, 6).toUpperCase()}</span>
                                    </div>
                                    {stkReceiptNumber && (
                                        <div className="flex justify-between text-neutral-500">
                                            <span>M-Pesa Receipt</span>
                                            <span className="text-emerald-700 font-bold">{stkReceiptNumber}</span>
                                        </div>
                                    )}
                                </div>

                                {stkStatus === 'PENDING' && (
                                    <div className="text-center py-3 space-y-2">
                                        <div className="flex items-center justify-center gap-2 text-emerald-700 font-mono text-xs uppercase tracking-wider font-bold">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Prompt Dispatched To Your Phone</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 leading-relaxed font-mono">
                                            Please check your phone, enter your 4-digit M-Pesa PIN on the SIM prompt to complete authorization.
                                        </p>
                                        {/* Expiry countdown */}
                                        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-neutral-500">
                                            <span>Session expires in</span>
                                            <span className={`font-bold tabular-nums ${stkCountdown <= 60 ? 'text-red-500' : 'text-black'}`}>
                                                {`${String(Math.floor(stkCountdown / 60)).padStart(2, '0')}:${String(stkCountdown % 60).padStart(2, '0')}`}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-neutral-400 font-mono">
                                            Listening for network confirmation...
                                        </p>
                                    </div>
                                )}

                                {stkStatus === 'SUCCESS' && (
                                    <div className="text-center py-3 space-y-2">
                                        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                            <CheckCircle2 size={28} />
                                        </div>
                                        <p className="text-sm font-bold text-black uppercase tracking-wider font-mono">
                                            Payment Authorized
                                        </p>
                                        <p className="text-xs text-neutral-500 font-mono">
                                            Redirecting to real-time order tracking terminal...
                                        </p>
                                    </div>
                                )}

                                {stkStatus === 'FAILED' && (
                                    <div className="text-center py-3 space-y-2">
                                        <div className="w-10 h-10 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                                            <AlertCircle size={22} />
                                        </div>
                                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider font-mono">
                                            Payment Not Completed
                                        </p>
                                        <p className="text-xs text-neutral-600 font-mono">
                                            {stkErrorMessage || 'Transaction cancelled or timed out on your device.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Actions */}
                            <div className="border-t border-neutral-200 p-4 sm:p-6 flex flex-col gap-2.5 shrink-0">
                                {stkStatus === 'FAILED' && (
                                    <button
                                        type="button"
                                        onClick={handleRetryStkPush}
                                        disabled={isRetryingStk}
                                        className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white font-mono uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                                    >
                                        {isRetryingStk ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                                        <span>Resend M-Pesa Prompt</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsStkModalOpen(false);
                                        if (stkOrderId) {
                                            clearCart();
                                            navigate(`/order/${stkOrderId}`);
                                        }
                                    }}
                                    className="w-full py-2.5 border border-neutral-200 hover:border-black text-neutral-600 hover:text-black font-mono uppercase tracking-widest text-[11px] transition-colors min-h-[40px]"
                                >
                                    {stkStatus === 'SUCCESS' ? 'Track Order Now' : 'Check Order Status Later'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
