import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Package,
    Bike,
    MapPin,
    CheckCircle2,
    Clock,
    Phone,
    Store,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { orderService } from '../../lib/supabaseService';
import { supabase } from '../../lib/supabaseClient';

export default function OrderStatus() {
    const { id, orderId } = useParams();
    const effectiveOrderId = id || orderId || '';
    const navigate = useNavigate();

    const [order, setOrder] = useState<any>(null);
    const [merchant, setMerchant] = useState<any>(null);
    const [rider, setRider] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadOrderData = useCallback(async () => {
        if (!effectiveOrderId) return;
        try {
            const result = await orderService.getOrder(effectiveOrderId);
            if (result.data) {
                setOrder(result.data);
                if (result.data.merchant) {
                    setMerchant(result.data.merchant);
                } else if (result.data.merchant_id) {
                    const { data: mData } = await supabase
                        .from('merchants')
                        .select('*')
                        .eq('id', result.data.merchant_id)
                        .single();
                    if (mData) setMerchant(mData);
                }

                if (result.data.rider) {
                    setRider(result.data.rider);
                } else if (result.data.rider_id) {
                    const { data: rData } = await supabase
                        .from('riders')
                        .select('*')
                        .eq('id', result.data.rider_id)
                        .single();
                    if (rData) setRider(rData);
                }
            }
        } catch (e) {
            console.error('Failed to fetch order tracking:', e);
        } finally {
            setLoading(false);
        }
    }, [effectiveOrderId]);

    useEffect(() => {
        loadOrderData();

        // Real-time Supabase channel for instant status progression
        const channel = supabase.channel(`order_live_${effectiveOrderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${effectiveOrderId}`
                },
                (payload) => {
                    if (payload.new) {
                        setOrder((prev: any) => ({ ...prev, ...payload.new }));
                        loadOrderData();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [effectiveOrderId, loadOrderData]);

    const getLifecycleStep = (status: string) => {
        switch (status) {
            case 'CREATED':
            case 'PAYMENT_PENDING':
                return 0;
            case 'PAYMENT_CONFIRMED':
            case 'AWAITING_MERCHANT_ACTION':
            case 'ACCEPTED':
                return 1;
            case 'PREPARING':
            case 'PACKING':
                return 2;
            case 'READY_FOR_PICKUP':
            case 'RIDER_ASSIGNED':
                return 3;
            case 'PICKED_UP':
            case 'OUT_FOR_DELIVERY':
                return 4;
            case 'DELIVERED':
            case 'COMPLETED':
                return 5;
            default:
                return 1;
        }
    };

    const getStatusNarrative = (status: string) => {
        switch (status) {
            case 'CREATED':
            case 'PAYMENT_PENDING':
                return {
                    headline: 'Payment Processing',
                    subtext: 'Verifying payment details with network gateway.',
                    badgeColor: 'text-amber-800 border-amber-300 bg-amber-50'
                };
            case 'PAYMENT_CONFIRMED':
            case 'AWAITING_MERCHANT_ACTION':
            case 'ACCEPTED':
                return {
                    headline: 'Order Confirmed',
                    subtext: `Sent directly to ${merchant?.business_name || 'the merchant'} preparation desk.`,
                    badgeColor: 'text-blue-800 border-blue-300 bg-blue-50'
                };
            case 'PREPARING':
            case 'PACKING':
                return {
                    headline: 'Merchant Packing Items',
                    subtext: 'Your fresh products are being hand-picked, weighed, and bagged.',
                    badgeColor: 'text-indigo-800 border-indigo-300 bg-indigo-50'
                };
            case 'READY_FOR_PICKUP':
                return {
                    headline: 'Packed & Ready for Dispatch',
                    subtext: 'Sealed package awaiting arrival of the assigned dispatch courier.',
                    badgeColor: 'text-emerald-800 border-emerald-300 bg-emerald-50'
                };
            case 'RIDER_ASSIGNED':
            case 'PICKED_UP':
                return {
                    headline: 'Courier Heading to Pickup',
                    subtext: `${rider?.name || 'Assigned rider'} is on route to collect your order.`,
                    badgeColor: 'text-purple-800 border-purple-300 bg-purple-50'
                };
            case 'OUT_FOR_DELIVERY':
                return {
                    headline: 'Out for Delivery',
                    subtext: 'Courier is in transit with your order to the destination address.',
                    badgeColor: 'text-purple-800 border-purple-300 bg-purple-50'
                };
            case 'DELIVERED':
            case 'COMPLETED':
                return {
                    headline: 'Order Delivered',
                    subtext: 'Package safely delivered to your designated address.',
                    badgeColor: 'text-green-800 border-green-300 bg-green-50'
                };
            case 'CANCELLED':
            case 'DECLINED':
                return {
                    headline: 'Order Cancelled',
                    subtext: 'This order was cancelled or could not be fulfilled.',
                    badgeColor: 'text-red-800 border-red-300 bg-red-50'
                };
            default:
                return {
                    headline: status?.replace(/_/g, ' ') || 'Order In Progress',
                    subtext: 'Tracking live updates from store and delivery team.',
                    badgeColor: 'text-neutral-800 border-neutral-300 bg-neutral-50'
                };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white text-black flex items-center justify-center font-mono">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black animate-spin" />
                    <span className="text-xs uppercase tracking-widest text-neutral-400">Loading Order Tracking...</span>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col justify-between">
                <header className="border-b border-neutral-200 px-6 sm:px-12 py-4">
                    <button
                        onClick={() => navigate('/stores')}
                        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Stores
                    </button>
                </header>
                <main className="max-w-xl mx-auto w-full px-6 py-16 text-center space-y-4">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Order Verification</span>
                    <h1 className="text-3xl font-light tracking-tight text-black">Order Not Found</h1>
                    <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
                        We could not find an order matching identifier #{effectiveOrderId.slice(0, 8)}. Please check your order history.
                    </p>
                    <button
                        onClick={() => navigate('/stores')}
                        className="inline-flex items-center gap-2 px-6 py-3.5 bg-black text-white text-xs font-mono uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                    >
                        Return to Catalogues
                    </button>
                </main>
                <footer className="border-t border-neutral-200 py-4 text-center text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                    Muncheez Operations · Nairobi
                </footer>
            </div>
        );
    }

    const narrative = getStatusNarrative(order.status);
    const activeStepIndex = getLifecycleStep(order.status);
    const isCancelled = order.status === 'CANCELLED' || order.status === 'DECLINED';

    const lifecycleStages = [
        { label: 'Placed', short: 'Placed', desc: 'Order received' },
        { label: 'Confirmed', short: 'Accept', desc: 'Routed to kitchen/store' },
        { label: 'Packing', short: 'Pack', desc: 'Hand-picked & bagged' },
        { label: 'Ready', short: 'Ready', desc: 'Awaiting courier' },
        { label: 'Transit', short: 'Transit', desc: 'Out for delivery' },
        { label: 'Delivered', short: 'Done', desc: 'Dropped off' }
    ];

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white pb-20">
            {/* Header: Edge-to-edge unboxed editorial banner with mobile responsiveness */}
            <header className="border-b border-neutral-200 px-3 sm:px-10 py-3 sm:py-3.5 sticky top-0 bg-white/95 backdrop-blur z-30 flex items-center justify-between gap-2">
                <button
                    onClick={() => navigate('/stores')}
                    className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono uppercase tracking-wider sm:tracking-widest text-neutral-500 hover:text-black transition-colors min-h-[40px] shrink-0"
                >
                    <ChevronLeft size={16} />
                    <span>Stores</span>
                </button>
                <div className="text-center min-w-0 flex-1 px-1">
                    <span className="font-heading font-bold text-lg sm:text-xl tracking-tighter block leading-tight">
                        Muncheez<span className="text-[#D4AF37]">.</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono text-neutral-400 uppercase tracking-widest block truncate">
                        Order #{effectiveOrderId.slice(0, 8).toUpperCase()}
                    </span>
                </div>
                <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-black block whitespace-nowrap">
                        KES {order.total?.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block whitespace-nowrap">
                        {order.items?.length || 0} items
                    </span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto w-full px-3.5 sm:px-6 py-5 sm:py-8 space-y-7">
                {/* ═══ HERO STATUS: UNBOXED EDITORIAL TYPOGRAPHY ═══ */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border ${narrative.badgeColor}`}>
                            {order.status.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-neutral-400 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Live Updates</span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-xl sm:text-3xl font-light tracking-tight text-black mb-1.5">
                            {narrative.headline}
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                            {narrative.subtext}
                        </p>
                    </div>

                    {/* Progress Bar & Responsive Stepper */}
                    {!isCancelled && (
                        <div className="pt-2 space-y-3">
                            {/* Mobile Active Stage Indicator */}
                            <div className="flex sm:hidden items-center justify-between text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                                <span>Step {activeStepIndex + 1} of 6</span>
                                <span className="font-bold text-black">{lifecycleStages[activeStepIndex]?.label}</span>
                            </div>

                            <div className="w-full h-1 bg-neutral-100 overflow-hidden">
                                <motion.div
                                    className="h-full bg-black"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, Math.max(12, ((activeStepIndex + 1) / lifecycleStages.length) * 100))}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                            </div>

                            <div className="grid grid-cols-6 text-center text-[9px] sm:text-[10px] font-mono uppercase tracking-tight sm:tracking-wider text-neutral-400 gap-1">
                                {lifecycleStages.map((stage, idx) => {
                                    const isDone = idx <= activeStepIndex;
                                    const isCurrent = idx === activeStepIndex;
                                    return (
                                        <div key={stage.label} className="space-y-0.5">
                                            <span className={`block font-medium truncate ${isCurrent ? 'text-black font-bold' : isDone ? 'text-neutral-700' : 'text-neutral-300'}`}>
                                                <span className="sm:hidden">{stage.short}</span>
                                                <span className="hidden sm:inline">{stage.label}</span>
                                            </span>
                                            {isCurrent && (
                                                <div className="w-1 h-1 rounded-full bg-black mx-auto" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>

                {/* ═══ STORE & COURIER ASSIGNMENT: UNBOXED HAIRLINE DIVIDERS ═══ */}
                <section className="border-t border-b border-neutral-200 py-5 sm:py-6 space-y-5">
                    {/* Merchant Details */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <Store size={18} className="text-neutral-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 min-w-0">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                                    Fulfilling Store
                                </span>
                                <h2 className="text-sm font-medium text-black truncate">
                                    {merchant?.business_name || 'Market Hub'}
                                </h2>
                                <p className="text-xs text-neutral-500 font-mono truncate">
                                    {merchant?.address || 'Nairobi'}
                                </p>
                            </div>
                        </div>
                        {merchant?.phone && (
                            <a
                                href={`tel:${merchant.phone}`}
                                className="w-full sm:w-auto text-center text-xs font-mono uppercase tracking-widest text-neutral-600 hover:text-black border border-neutral-300 hover:border-black px-4 py-2 transition-colors shrink-0 min-h-[38px] flex items-center justify-center"
                            >
                                Contact Store
                            </a>
                        )}
                    </div>

                    {/* Courier Details */}
                    {rider ? (
                        <div className="border-t border-neutral-100 pt-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                <Bike size={18} className="text-neutral-400 shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                                        Assigned Courier
                                    </span>
                                    <h3 className="text-sm font-medium text-black truncate">
                                        {rider.name || rider.full_name || 'Dispatch Courier'}
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-mono truncate">
                                        {rider.vehicle_type || 'Motorbike'} · {rider.phone || 'Fleet Dispatch'}
                                    </p>
                                </div>
                            </div>
                            {rider.phone && (
                                <a
                                    href={`tel:${rider.phone}`}
                                    className="w-full sm:w-auto text-center text-xs font-mono uppercase tracking-widest text-neutral-600 hover:text-black border border-neutral-300 hover:border-black px-4 py-2 transition-colors shrink-0 min-h-[38px] flex items-center justify-center"
                                >
                                    Call Rider
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="border-t border-neutral-100 pt-5 flex items-center gap-3 text-neutral-400 font-mono text-xs leading-relaxed">
                            <Clock size={16} className="shrink-0" />
                            <span>Courier dispatch assignment in progress once packing finishes.</span>
                        </div>
                    )}

                    {/* Delivery Destination */}
                    <div className="border-t border-neutral-100 pt-5 flex items-start gap-3">
                        <MapPin size={18} className="text-neutral-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0 flex-1">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                                Delivering To
                            </span>
                            <p className="text-sm text-black break-words">
                                {order.delivery_address || 'Address provided at checkout'}
                            </p>
                            {order.delivery_instructions && (
                                <p className="text-xs text-neutral-500 font-mono pt-0.5 break-words">
                                    Notes: {order.delivery_instructions}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* ═══ ORDER BASKET ITEMS: UNBOXED EDITORIAL LIST ═══ */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
                        <h2 className="uppercase tracking-wider sm:tracking-widest text-neutral-400">
                            Package Line Items ({order.items?.length || 0})
                        </h2>
                        <span className="text-neutral-500">
                            Payment: {order.payment_method || 'MPESA'} ({order.payment_status || 'CONFIRMED'})
                        </span>
                    </div>

                    <div className="border-t border-b border-neutral-200 divide-y divide-neutral-100">
                        {(order.items || []).map((item: any, i: number) => (
                            <div key={i} className="py-2.5 sm:py-3 flex items-center justify-between gap-3 text-xs font-mono">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="font-bold text-neutral-400 min-w-[22px] shrink-0">
                                        {item.quantity}x
                                    </span>
                                    <span className="text-black font-medium truncate">
                                        {item.name}
                                    </span>
                                </div>
                                <span className="text-neutral-600 shrink-0 whitespace-nowrap">
                                    KES {((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Financial Breakdown */}
                    <div className="space-y-1.5 text-xs font-mono pt-2">
                        <div className="flex justify-between text-neutral-500">
                            <span className="uppercase tracking-wider sm:tracking-widest">Courier Delivery</span>
                            <span>KES {(order.delivery_fee || 150).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-black font-bold pt-2 border-t border-neutral-100 text-sm sm:text-base">
                            <span className="uppercase tracking-wider sm:tracking-widest">Total Paid</span>
                            <span>KES {order.total?.toLocaleString()}</span>
                        </div>
                    </div>
                </section>

                {/* Footer Navigation: Mobile-friendly full width buttons */}
                <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                        onClick={() => navigate('/stores')}
                        className="w-full sm:w-auto px-6 py-3.5 border border-neutral-300 hover:border-black text-xs font-mono uppercase tracking-widest transition-colors min-h-[44px]"
                    >
                        Browse Other Stores
                    </button>
                    <a
                        href="https://wa.me/254700000000"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto px-6 py-3.5 bg-black hover:bg-neutral-800 text-white text-xs font-mono uppercase tracking-widest text-center transition-colors min-h-[44px] flex items-center justify-center"
                    >
                        Muncheez Live Help
                    </a>
                </div>
            </main>
        </div>
    );
}
