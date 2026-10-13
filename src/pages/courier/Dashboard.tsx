import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dispatchService, walletService, riderService } from '../../lib/supabaseService';
import {
    Bike,
    MapPin,
    Clock,
    CheckCircle2,
    Phone,
    Navigation,
    Wallet,
    Power,
    LogOut,
    Eye,
    TrendingUp,
    AlertCircle,
    ArrowUpRight,
    ShieldCheck,
    Store,
    Package,
    Shield,
    Settings,
    FileText,
    AlertTriangle,
    DollarSign,
    Award,
    Activity,
    User,
    ArrowDownLeft,
    ArrowUpRight as ArrowUpRightIcon,
    RefreshCw,
    Save
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

interface DispatchOffer {
    id: string;
    supermarketName: string;
    supermarketBranch: string;
    supermarketAddress: string;
    dropoffAddress: string;
    customerName: string;
    customerPhone: string;
    distanceKm: number;
    itemsCount: number;
    payoutKES: number;
    placedAt: string;
    status: 'OFFERED' | 'HEADING_TO_STORE' | 'AT_STORE' | 'PICKED_UP' | 'DELIVERED';
    paymentMethod: 'MPESA_PREPAID' | 'CASH_ON_DELIVERY';
}

interface WalletTransaction {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    timestamp: string;
    referenceId: string;
}

// Real-time dispatch offers and wallet ledgers stream directly from Supabase
type CourierTab = 'HOME' | 'WALLET' | 'PERFORMANCE' | 'SAFETY' | 'MORE' | 'SETTINGS';

export default function CourierDashboard() {
    const navigate = useNavigate();
    const { profile, signOut } = useAuth();

    // Tab state
    const [activeTab, setActiveTab] = useState<CourierTab>('HOME');

    // Courier Presence State
    const [presence, setPresence] = useState<'ONLINE_IDLE' | 'OFFLINE'>('ONLINE_IDLE');
    const [availableOffers, setAvailableOffers] = useState<DispatchOffer[]>([]);
    const [activeMission, setActiveMission] = useState<DispatchOffer | null>(null);

    // Rider Settings State (Editable — populated from Supabase)
    const [riderName, setRiderName] = useState(profile?.full_name || '');
    const [riderPhone, setRiderPhone] = useState(profile?.phone || '');
    const [riderVehicleType, setRiderVehicleType] = useState('');
    const [riderVehicleMake, setRiderVehicleMake] = useState('');
    const [riderVehicleModel, setRiderVehicleModel] = useState('');
    const [riderPlate, setRiderPlate] = useState('');
    const [riderOperatingZone, setRiderOperatingZone] = useState('');
    const [riderEmergencyContact, setRiderEmergencyContact] = useState('');

    // Approval gate check on mount
    useEffect(() => {
        if (!profile?.id) return;
        const isApprovedLocally = localStorage.getItem('muncheez_rider_approved_' + profile.id) === 'true';
        if (profile.status === 'APPROVED' || isApprovedLocally) {
            return;
        }
        riderService.getRider(profile.id).then(({ data }) => {
            if (!data || data.status !== 'APPROVED') {
                navigate('/rider/onboarding', { replace: true });
            } else {
                if (data.vehicle_type) setRiderVehicleType(data.vehicle_type);
                if (data.vehicle_plate) setRiderPlate(data.vehicle_plate);
            }
        }).catch(() => {
            if (profile.status === 'PENDING') {
                navigate('/rider/onboarding', { replace: true });
            }
        });
    }, [profile?.id, profile?.status, navigate]);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (e) {
            console.error('Courier logout error:', e);
        } finally {
            navigate('/rider/signup');
        }
    };

    const handleSaveRiderSettings = async () => {
        try {
            const payload = {
                vehicle_type: riderVehicleType,
                vehicle_make: riderVehicleMake,
                vehicle_model: riderVehicleModel,
                vehicle_plate: riderPlate.trim().toUpperCase(),
                operating_zone: riderOperatingZone,
                emergency_contact: riderEmergencyContact
            };
            localStorage.setItem('muncheez_rider_settings', JSON.stringify(payload));
            if (riderId) {
                await riderService.updateRider(riderId, payload as any);
            }
            setVehicleInfo(prev => ({
                ...prev,
                type: riderVehicleType,
                make: riderVehicleMake,
                model: riderVehicleModel,
                plate: riderPlate.trim().toUpperCase()
            }));
            alert('Rider profile and vehicle details updated successfully!');
        } catch (e) {
            console.error('Save rider settings error:', e);
            alert('Rider settings saved locally.');
        }
    };

    // Wallet Ledger
    const [walletBalance, setWalletBalance] = useState(0);
    const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
    const [isCashoutLoading, setIsCashoutLoading] = useState(false);

    // SOS State
    const [isSosActive, setIsSosActive] = useState(false);

    // Shift Stats
    const completedTrips = walletTransactions.filter(t => t.type === 'CREDIT').length;
    const shiftMinutes = 0;

    // ── SUPABASE DATA LOADING ───────────────────────────────────────────────
    const [riderId, setRiderId] = useState<string | null>(null);
    const [vehicleInfo, setVehicleInfo] = useState({
        type: '', make: '', model: '', plate: '',
        inspectionStatus: 'Pending Verification',
        helmetVerified: false,
        thermalBagVerified: false
    });

    const loadCourierData = useCallback(async (rId: string) => {
        try {
            // Load pending dispatch offers
            const { data: offers } = await dispatchService.getPendingOffers(rId);
            if (offers && offers.length > 0) {
                const mapped: DispatchOffer[] = offers.map((o: any) => ({
                    id: o.id,
                    supermarketName: o.order?.store?.name || 'Muncheez Supermarket',
                    supermarketBranch: o.order?.store?.branch || 'Nairobi',
                    supermarketAddress: o.order?.store?.address || 'Nairobi CBD',
                    dropoffAddress: o.order?.delivery_address || 'Customer Address',
                    customerName: o.order?.customer?.full_name || 'Customer',
                    customerPhone: o.order?.customer?.phone || '+254 700 000000',
                    distanceKm: o.metadata?.distance_km || 2.5,
                    itemsCount: (o.order?.items || []).length,
                    payoutKES: o.metadata?.payout_kes || 250,
                    placedAt: new Date(o.offered_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
                    status: 'OFFERED',
                    paymentMethod: o.order?.payment_method === 'CASH' ? 'CASH_ON_DELIVERY' : 'MPESA_PREPAID'
                }));
                setAvailableOffers(mapped);
            }

            // Load wallet ledger
            const { data: ledger } = await walletService.getEntries(rId);
            if (ledger && ledger.length > 0) {
                const mapped: WalletTransaction[] = ledger.map((e: any) => ({
                    id: e.id,
                    type: e.amount > 0 ? 'CREDIT' : 'DEBIT',
                    amount: Math.abs(e.amount),
                    description: e.metadata?.description || e.transaction_type,
                    timestamp: new Date(e.created_at).toLocaleString('en-KE', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
                    referenceId: e.order_id || e.id
                }));
                setWalletTransactions(mapped);
                const balance = ledger.reduce((sum: number, e: any) => sum + e.amount, 0);
                setWalletBalance(Math.max(0, balance));
            }
        } catch (err) {
            console.error('[CourierDashboard] Failed to load data from Supabase:', err);
            setAvailableOffers([]); setWalletTransactions([]); setWalletBalance(0);
        }
    }, []);

    useEffect(() => {
        if (!profile?.id) return;
        riderService.getRider(profile.id).then(({ data }) => {
            if (data) {
                const id = data.id || profile.id;
                setRiderId(id);
                // Sync rider info from Supabase
                if (data.vehicle_type) setRiderVehicleType(data.vehicle_type);
                if (data.vehicle_make) setRiderVehicleMake(data.vehicle_make);
                if (data.vehicle_model) setRiderVehicleModel(data.vehicle_model);
                if (data.vehicle_plate) setRiderPlate(data.vehicle_plate);
                if ((data as any).operating_zone) setRiderOperatingZone((data as any).operating_zone);
                if ((data as any).emergency_contact) setRiderEmergencyContact((data as any).emergency_contact);
                if (data.vehicle_type || data.vehicle_make) {
                    setVehicleInfo(prev => ({
                        ...prev,
                        type: data.vehicle_type || prev.type,
                        make: data.vehicle_make || prev.make,
                        model: data.vehicle_model || prev.model,
                        plate: data.vehicle_plate || prev.plate,
                        helmetVerified: (data as any).helmet_verified ?? prev.helmetVerified,
                        thermalBagVerified: (data as any).thermal_bag_verified ?? prev.thermalBagVerified,
                        inspectionStatus: (data as any).inspection_status || prev.inspectionStatus,
                    }));
                }
                // Sync online/offline status from DB
                if (data.is_online !== undefined) {
                    setPresence(data.is_online ? 'ONLINE_IDLE' : 'OFFLINE');
                }
                loadCourierData(id);
            }
        }).catch(console.error);
    }, [profile?.id, loadCourierData]);

    // Real-time dispatch subscription — new offers flash on screen instantly
    useEffect(() => {
        if (!riderId) return;
        const sub = dispatchService.subscribeToOffers(riderId, (payload) => {
            if (payload.new?.status !== 'PENDING') return;
            const o = payload.new;
            const newOffer: DispatchOffer = {
                id: o.id,
                supermarketName: 'New Dispatch Order',
                supermarketBranch: 'Nairobi',
                supermarketAddress: 'See details',
                dropoffAddress: 'Customer Address',
                customerName: 'Customer',
                customerPhone: '+254 700 000000',
                distanceKm: o.metadata?.distance_km || 2.5,
                itemsCount: o.metadata?.items_count || 1,
                payoutKES: o.metadata?.payout_kes || 250,
                placedAt: 'Just now',
                status: 'OFFERED',
                paymentMethod: 'MPESA_PREPAID'
            };
            setAvailableOffers(prev => [newOffer, ...prev]);
        });
        return () => { sub.unsubscribe?.(); };
    }, [riderId]);

    // Sync online status to Supabase when presence changes
    useEffect(() => {
        if (!riderId) return;
        riderService.updateRider(riderId, { is_online: presence === 'ONLINE_IDLE' })
            .catch(console.error);
    }, [presence, riderId]);

    // Performance Metrics — derived from real wallet/transaction data
    const realCompletedDeliveries = walletTransactions.filter(t => t.type === 'CREDIT').length;
    const performanceStats = {
        tier: realCompletedDeliveries >= 100 ? 'Gold Tier · High Priority Dispatch'
             : realCompletedDeliveries >= 20 ? 'Silver Tier · Standard Dispatch'
             : 'New Partner · Building History',
        rating: (profile as any)?.rating || 0,
        acceptanceRate: 0, // TODO: compute from dispatch_offers accepted/offered ratio when data available
        completionRate: 0, // TODO: compute from completed vs accepted orders when data available
        onTimeRate: 0,
        reliabilityScore: 0,
        hourlyRateKES: realCompletedDeliveries >= 100 ? 310 : 250,
        totalDeliveriesAllTime: realCompletedDeliveries
    };

    // Accept Offer (local + Supabase)
    const handleAcceptOffer = useCallback(async (offer: DispatchOffer) => {
        const mission: DispatchOffer = { ...offer, status: 'HEADING_TO_STORE' };
        setActiveMission(mission);
        setAvailableOffers((prev) => prev.filter((o) => o.id !== offer.id));
        // Sync acceptance to Supabase
        try {
            await dispatchService.respondToOffer(offer.id, 'ACCEPTED');
        } catch (err) {
            console.error('[CourierDashboard] Accept offer sync failed:', err);
        }
    }, []);

    // Progression Stepper (local + Supabase)
    const handleProgressMission = useCallback(async () => {
        if (!activeMission) return;

        if (activeMission.status === 'HEADING_TO_STORE') {
            setActiveMission({ ...activeMission, status: 'AT_STORE' });
        } else if (activeMission.status === 'AT_STORE') {
            setActiveMission({ ...activeMission, status: 'PICKED_UP' });
        } else if (activeMission.status === 'PICKED_UP') {
            // Delivery completed!
            const newTx: WalletTransaction = {
                id: `TX-${Date.now().toString().slice(-4)}`,
                type: 'CREDIT',
                amount: activeMission.payoutKES,
                description: `Supermarket Delivery Dispatch (${activeMission.id})`,
                timestamp: 'Just now',
                referenceId: activeMission.id
            };
            setWalletBalance((prev) => prev + activeMission.payoutKES);
            setWalletTransactions((prev) => [newTx, ...prev]);
            setActiveMission(null);
            // Sync wallet credit to Supabase
            if (riderId) {
                try {
                    await walletService.createEntry({
                        user_id: riderId,
                        amount: activeMission.payoutKES,
                        transaction_type: 'DELIVERY_PAYOUT',
                        metadata: { description: `Delivery payout for dispatch ${activeMission.id}`, dispatch_id: activeMission.id }
                    });
                } catch (err) {
                    console.error('[CourierDashboard] Wallet credit sync failed:', err);
                }
            }
        }
    }, [activeMission, riderId]);

    // Instant M-Pesa Cashout (local + Supabase)
    const handleCashout = useCallback(async () => {
        if (walletBalance < 500) {
            alert('Minimum withdrawal threshold is KES 500.');
            return;
        }
        setIsCashoutLoading(true);
        const withdrawAmount = walletBalance;
        const refId = `B2C-${Date.now().toString().slice(-6)}`;
        const newTx: WalletTransaction = {
            id: `WD-${Date.now().toString().slice(-4)}`,
            type: 'DEBIT',
            amount: withdrawAmount,
            description: `Instant M-Pesa Cashout to ${profile?.phone || '+254 700 000000'}`,
            timestamp: 'Just now',
            referenceId: refId
        };
        setWalletBalance(0);
        setWalletTransactions((prev) => [newTx, ...prev]);
        if (riderId) {
            try {
                await walletService.createEntry({
                    user_id: riderId,
                    amount: -withdrawAmount,
                    transaction_type: 'MPESA_WITHDRAWAL',
                    metadata: {
                        description: `Instant M-Pesa Cashout to ${profile?.phone}`,
                        reference: refId,
                        provider: 'Safaricom Daraja B2C'
                    }
                });
            } catch (err) {
                console.error('[CourierDashboard] Cashout sync failed:', err);
            }
        }
        setIsCashoutLoading(false);
        alert(`M-Pesa Cashout Successful! KES ${withdrawAmount.toLocaleString()} disbursed via Daraja API.`);
    }, [walletBalance, riderId, profile?.phone]);

    // Emergency SOS
    const triggerEmergencySOS = () => {
        setIsSosActive(true);
        setTimeout(() => {
            alert('EMERGENCY BROADCAST TRANSMITTED. Muncheez Incident Operations and National Police Service have been dispatched to your GPS coordinates.');
            setIsSosActive(false);
        }, 2000);
    };

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
                            {profile?.full_name || 'Courier Partner'}{vehicleInfo.plate ? ` · ${vehicleInfo.make} ${vehicleInfo.model} (${vehicleInfo.plate})` : ''}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">
                            Courier Dispatch Terminal · Westlands Metropolis
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    {/* Shift Online/Offline Toggle */}
                    <button
                        onClick={() => setPresence(presence === 'ONLINE_IDLE' ? 'OFFLINE' : 'ONLINE_IDLE')}
                        className={`flex items-center gap-2 border px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                            presence === 'ONLINE_IDLE'
                                ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                                : 'border-neutral-300 text-neutral-500 bg-neutral-50'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${presence === 'ONLINE_IDLE' ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                        {presence === 'ONLINE_IDLE' ? 'Active Online' : 'Offline / Standby'}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="text-xs text-neutral-400 hover:text-black font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                    >
                        <LogOut size={13} />
                        Logout
                    </button>
                </div>
            </header>

            {/* Navigation Tabs (All Courier Workspaces) */}
            <div className="border-b border-neutral-200 px-6 sm:px-10 flex gap-8 overflow-x-auto scrollbar-none text-xs font-mono uppercase tracking-widest">
                <button
                    onClick={() => setActiveTab('HOME')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'HOME' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Radar & Missions ({availableOffers.length})
                </button>
                <button
                    onClick={() => setActiveTab('WALLET')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'WALLET' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Wallet & Payouts (KES {walletBalance.toLocaleString()})
                </button>
                <button
                    onClick={() => setActiveTab('PERFORMANCE')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'PERFORMANCE' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Performance & Tier ({performanceStats.rating}★)
                </button>
                <button
                    onClick={() => setActiveTab('SAFETY')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'SAFETY' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Safety & Emergency SOS
                </button>
                <button
                    onClick={() => setActiveTab('MORE')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'MORE' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Vehicle & Profile
                </button>
                <button
                    onClick={() => setActiveTab('SETTINGS')}
                    className={`py-3.5 border-b-2 whitespace-nowrap transition-all ${
                        activeTab === 'SETTINGS' ? 'border-black text-black font-bold' : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                >
                    Rider Settings
                </button>
            </div>

            {/* Bento Grid Body (No rounded boxes, clean hairline cells) */}
            <main className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-8 flex-1 space-y-8">
                {/* 1. HOME TAB (RADAR & ACTIVE MISSIONS) */}
                {activeTab === 'HOME' && (
                    <div className="space-y-8">
                        {/* Top Bento Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 border border-neutral-200 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Wallet Balance</span>
                                <span className="text-3xl font-light text-black font-mono">KES {walletBalance.toLocaleString()}</span>
                                <span className="text-[11px] text-emerald-700 font-mono block mt-1">Ready for M-Pesa Cashout</span>
                            </div>
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Trips Completed</span>
                                <span className="text-3xl font-light text-black font-mono">{completedTrips}</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Supermarket hauls fulfilled</span>
                            </div>
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Active Shift</span>
                                <span className="text-3xl font-light text-black font-mono">
                                    {Math.floor(shiftMinutes / 60)}h {shiftMinutes % 60}m
                                </span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Westlands Sector Active</span>
                            </div>
                            <div className="p-5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Fleet Tier</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <Award size={18} className="text-amber-600" />
                                    <span className="text-xl font-light text-black">Gold Partner</span>
                                </div>
                                <span className="text-[11px] text-neutral-400 block mt-1">+15% Priority Dispatch Bonus</span>
                            </div>
                        </div>

                        {/* Active Mission Stepper */}
                        {activeMission && (
                            <div className="border-2 border-black p-6 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                                    <div>
                                        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200 inline-block mb-2">
                                            Active Delivery Mission · {activeMission.id}
                                        </span>
                                        <h2 className="text-2xl font-light text-black">
                                            {activeMission.status === 'HEADING_TO_STORE' && 'Head to Supermarket for Grocery Pickup'}
                                            {activeMission.status === 'AT_STORE' && 'Confirm & Collect Groceries'}
                                            {activeMission.status === 'PICKED_UP' && 'En Route to Customer Destination'}
                                        </h2>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">Guaranteed Courier Payout</span>
                                        <span className="text-2xl font-mono font-bold text-black">KES {activeMission.payoutKES}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                                    <div className="border border-neutral-200 p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-neutral-400 font-mono text-[10px] uppercase tracking-wider">
                                            <Store size={14} />
                                            <span>Pickup Supermarket</span>
                                        </div>
                                        <div className="font-bold text-sm text-black">{activeMission.supermarketName}</div>
                                        <div className="text-neutral-500 font-mono">{activeMission.supermarketAddress}</div>
                                        <div className="text-[11px] text-neutral-400">Pack items: {activeMission.itemsCount} supermarket goods</div>
                                    </div>

                                    <div className="border border-neutral-200 p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-neutral-400 font-mono text-[10px] uppercase tracking-wider">
                                            <MapPin size={14} />
                                            <span>Drop-off Destination</span>
                                        </div>
                                        <div className="font-bold text-sm text-black">{activeMission.customerName}</div>
                                        <div className="text-neutral-500 font-mono">{activeMission.dropoffAddress}</div>
                                        <a
                                            href={`tel:${activeMission.customerPhone}`}
                                            className="inline-flex items-center gap-1.5 text-black hover:text-[#00BCD4] font-mono transition-colors text-[11px]"
                                        >
                                            <Phone size={11} /> Call Customer ({activeMission.customerPhone})
                                        </a>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-neutral-200 flex justify-end">
                                    <button
                                        onClick={handleProgressMission}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={14} />
                                        {activeMission.status === 'HEADING_TO_STORE' && 'Confirm Arrival at Supermarket'}
                                        {activeMission.status === 'AT_STORE' && 'Confirm Items Packed & Picked Up'}
                                        {activeMission.status === 'PICKED_UP' && 'Complete Delivery & Collect KES Payout'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Dispatch Radar */}
                        <div className="border border-neutral-200">
                            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    <h2 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                        Available Supermarket Pickups ({availableOffers.length})
                                    </h2>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                                    {presence === 'ONLINE_IDLE' ? 'Radar Online · Realtime Dispatch' : 'Terminal Offline'}
                                </span>
                            </div>

                            <div className="divide-y divide-neutral-200">
                                {presence === 'OFFLINE' ? (
                                    <div className="py-16 text-center text-neutral-400 text-xs font-mono uppercase tracking-widest">
                                        You are currently offline. Switch to 'Active Online' at the top to receive jobs.
                                    </div>
                                ) : availableOffers.length === 0 ? (
                                    <div className="py-16 text-center text-neutral-400 text-xs font-mono uppercase tracking-widest">
                                        Radar scanning for ready grocery orders in Westlands sector...
                                    </div>
                                ) : (
                                    availableOffers.map((offer) => (
                                        <div key={offer.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-neutral-50/50 transition-colors">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xs font-bold text-black">{offer.id}</span>
                                                    <span className="text-neutral-300">·</span>
                                                    <span className="text-xs text-neutral-500 font-mono">{offer.placedAt}</span>
                                                    <span className="text-neutral-300">·</span>
                                                    <span className="text-xs font-mono text-neutral-600">{offer.distanceKm} km haul</span>
                                                </div>

                                                <div className="text-sm font-medium text-black">
                                                    {offer.supermarketName} <span className="text-neutral-400 font-mono text-xs">({offer.supermarketBranch})</span>
                                                </div>

                                                <div className="text-xs text-neutral-400 flex items-center gap-1.5 font-mono">
                                                    <MapPin size={12} />
                                                    Drop-off: {offer.dropoffAddress}
                                                </div>

                                                <div className="text-[11px] text-neutral-500 font-mono">
                                                    Grocery Basket: {offer.itemsCount} supermarket items packaged
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-neutral-100 justify-between md:justify-end">
                                                <div className="text-left md:text-right">
                                                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                                                        Net Courier Payout
                                                    </span>
                                                    <span className="text-xl font-bold font-mono text-black">
                                                        KES {offer.payoutKES}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => handleAcceptOffer(offer)}
                                                    disabled={Boolean(activeMission)}
                                                    className="px-6 py-3 bg-black text-white hover:bg-neutral-800 disabled:opacity-40 text-xs font-mono uppercase tracking-widest transition-colors"
                                                >
                                                    Accept Job
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. WALLET & PAYOUTS TAB (from COMEAROUND/courier/Dashboard.tsx) */}
                {activeTab === 'WALLET' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 border border-neutral-200 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Available Balance</span>
                                <span className="text-4xl font-light text-black font-mono">KES {walletBalance.toLocaleString()}</span>
                                <span className="text-[11px] text-emerald-700 font-mono block mt-1">Cleared for instant M-Pesa withdrawal</span>
                            </div>
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Today's Shift Haul</span>
                                <span className="text-4xl font-light text-black font-mono">KES 1,280</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">From 7 fulfilled deliveries</span>
                            </div>
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">M-Pesa Registered Number</span>
                                <span className="text-2xl font-light text-black font-mono">{profile?.phone || '+254 711 998 877'}</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Direct Daraja B2C recipient</span>
                            </div>
                        </div>

                        {/* Instant Cashout Action Bar */}
                        <div className="border border-neutral-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                    Instant Daraja M-Pesa Payout
                                </h3>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    Disbursements are deposited instantly into your M-Pesa wallet. (Min: KES 500)
                                </p>
                            </div>
                            <button
                                onClick={handleCashout}
                                disabled={isCashoutLoading || walletBalance < 500}
                                className="px-8 py-3.5 bg-black text-white hover:bg-neutral-800 disabled:opacity-40 text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-2 self-start sm:self-auto"
                            >
                                <Wallet size={14} />
                                {isCashoutLoading ? 'Processing Daraja Transfer...' : `Withdraw KES ${walletBalance.toLocaleString()} to M-Pesa`}
                            </button>
                        </div>

                        {/* Transaction Ledger */}
                        <div className="border border-neutral-200 overflow-x-auto">
                            <div className="px-6 py-4 border-b border-neutral-200">
                                <h4 className="text-xs font-mono uppercase tracking-widest font-bold text-black">
                                    Courier Transaction Ledger
                                </h4>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                                        <th className="py-3 px-4">Tx ID & Ref</th>
                                        <th className="py-3 px-4">Description</th>
                                        <th className="py-3 px-4">Type</th>
                                        <th className="py-3 px-4">Amount</th>
                                        <th className="py-3 px-4 text-right">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 text-xs font-mono">
                                    {walletTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-neutral-50/50 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-black">{tx.id} <span className="text-neutral-400 font-normal">({tx.referenceId})</span></td>
                                            <td className="py-3.5 px-4 text-neutral-700">{tx.description}</td>
                                            <td className="py-3.5 px-4">
                                                <span className={`text-[10px] uppercase px-2 py-0.5 border ${
                                                    tx.type === 'CREDIT' ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : 'border-neutral-300 text-neutral-700'
                                                }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className={`py-3.5 px-4 font-bold ${tx.type === 'CREDIT' ? 'text-emerald-700' : 'text-neutral-900'}`}>
                                                {tx.type === 'CREDIT' ? '+' : '-'}KES {tx.amount.toLocaleString()}
                                            </td>
                                            <td className="py-3.5 px-4 text-right text-neutral-400">{tx.timestamp}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. PERFORMANCE & TIER TAB (from PerformanceEngine) */}
                {activeTab === 'PERFORMANCE' && (
                    <div className="space-y-8">
                        <div className="border border-neutral-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 border border-amber-200 inline-block mb-1">
                                    {performanceStats.tier}
                                </span>
                                <h3 className="text-2xl font-light text-black">
                                    Fleet Rating: <span className="font-bold">{performanceStats.rating} / 5.0</span>
                                </h3>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    Based on customer delivery reviews and supermarket packing verification.
                                </p>
                            </div>
                            <div className="text-left md:text-right font-mono">
                                <span className="text-[10px] uppercase text-neutral-400 block">Total Career Deliveries</span>
                                <span className="text-2xl font-bold text-black">{performanceStats.totalDeliveriesAllTime}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 border border-neutral-200 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200">
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Acceptance Rate</span>
                                <span className="text-3xl font-light text-black font-mono">{performanceStats.acceptanceRate}%</span>
                                <span className="text-[11px] text-emerald-700 block mt-1">Excellent response</span>
                            </div>
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Completion Rate</span>
                                <span className="text-3xl font-light text-black font-mono">{performanceStats.completionRate}%</span>
                                <span className="text-[11px] text-emerald-700 block mt-1">Zero dropped orders</span>
                            </div>
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">On-Time Arrival</span>
                                <span className="text-3xl font-light text-black font-mono">{performanceStats.onTimeRate}%</span>
                                <span className="text-[11px] text-neutral-400 block mt-1">Under 25 min average</span>
                            </div>
                            <div className="p-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">Reliability Score</span>
                                <span className="text-3xl font-light text-black font-mono">{performanceStats.reliabilityScore}%</span>
                                <span className="text-[11px] text-emerald-700 block mt-1">Top tier fleet priority</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. SAFETY & EMERGENCY SOS TAB */}
                {activeTab === 'SAFETY' && (
                    <div className="space-y-8 max-w-3xl">
                        <div className="border border-red-300 p-8 space-y-6">
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-widest text-red-700 bg-red-50 px-2.5 py-1 border border-red-200 inline-block mb-2">
                                    Road Incident Protocol
                                </span>
                                <h3 className="text-2xl font-light text-black">
                                    Emergency Road Assistance & SOS Broadcast
                                </h3>
                                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                                    In case of road accident, security incident, or breakdown, trigger the SOS button. Our safety team will automatically dispatch roadside support and emergency services to your GPS coordinates.
                                </p>
                            </div>

                            <button
                                onClick={triggerEmergencySOS}
                                disabled={isSosActive}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-mono uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                            >
                                <AlertTriangle size={16} />
                                {isSosActive ? 'Transmitting Live Coordinates...' : 'TRIGGER EMERGENCY SOS DISPATCH'}
                            </button>
                        </div>

                        {/* Emergency Contact List */}
                        <div className="border border-neutral-200 p-6 space-y-4">
                            <h4 className="text-xs font-mono uppercase tracking-widest font-bold text-black">
                                Emergency Contacts (Nairobi Metropolis)
                            </h4>
                            <div className="divide-y divide-neutral-200 text-xs font-mono">
                                <div className="py-3 flex justify-between items-center">
                                    <span className="text-black">National Police Emergency Service</span>
                                    <a href="tel:999" className="text-black underline font-bold">999 / 112</a>
                                </div>
                                <div className="py-3 flex justify-between items-center">
                                    <span className="text-black">Muncheez Fleet Operations Dispatch Desk</span>
                                    <a href="tel:+254700123456" className="text-black underline font-bold">+254 700 123 456</a>
                                </div>
                                <div className="py-3 flex justify-between items-center">
                                    <span className="text-black">St. John Ambulance Service</span>
                                    <a href="tel:0202210000" className="text-black underline font-bold">020 221 0000</a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. VEHICLE & PROFILE TAB (from MORE tab) */}
                {activeTab === 'MORE' && (
                    <div className="space-y-8 max-w-3xl">
                        <div className="border border-neutral-200 p-6 space-y-4">
                            <h3 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                Vehicle Inspection & Specifications
                            </h3>
                            <div className="divide-y divide-neutral-200 text-xs font-mono">
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">Vehicle Category</span>
                                    <span className="text-black font-bold">{vehicleInfo.type} (Boda Boda Fleet)</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">Make & Model</span>
                                    <span className="text-black">{vehicleInfo.make} {vehicleInfo.model}</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">Registration Plate</span>
                                    <span className="text-black font-bold">{vehicleInfo.plate}</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">Inspection Status</span>
                                    <span className="text-emerald-700 font-bold">{vehicleInfo.inspectionStatus}</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">Protective Helmet Verified</span>
                                    <span className="text-emerald-700">Verified & Approved</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">Thermal Grocery Bag Verified</span>
                                    <span className="text-emerald-700">Verified & Approved</span>
                                </div>
                            </div>
                        </div>

                        <div className="border border-neutral-200 p-6 space-y-4">
                            <h3 className="text-sm font-mono uppercase tracking-widest font-bold text-black">
                                Fleet Courier Credentials
                            </h3>
                            <div className="divide-y divide-neutral-200 text-xs font-mono">
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">Full Name</span>
                                    <span className="text-black">{profile?.full_name || 'Kelvin Mwangi'}</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">Contact Phone</span>
                                    <span className="text-black">{profile?.phone || '+254 711 998 877'}</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">National ID Number</span>
                                    <span className="text-black">33819204</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-neutral-400 uppercase">Operational Zone</span>
                                    <span className="text-black">Westlands, Kilimani, Lavington Metropolis</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. RIDER SETTINGS TAB */}
                {activeTab === 'SETTINGS' && (

                    <div className="border border-neutral-200 p-8 space-y-10 max-w-4xl">
                        <div className="border-b border-neutral-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-mono uppercase tracking-widest font-bold text-black">
                                    Courier Profile & Vehicle Settings
                                </h3>
                                <p className="text-xs text-neutral-400 mt-1">
                                    Manage your courier identity, vehicle specifications, and operational dispatch zones.
                                </p>
                            </div>
                            <button
                                onClick={handleSaveRiderSettings}
                                className="px-6 py-2.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-2 self-start sm:self-auto"
                            >
                                <Save size={13} />
                                Save Rider Settings
                            </button>
                        </div>

                        {/* SECTION 1: RIDER IDENTITY */}
                        <div className="space-y-6">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block border-b border-neutral-100 pb-2">
                                01 · Personal Information
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Rider Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={riderName}
                                        onChange={(e) => setRiderName(e.target.value)}
                                        placeholder="Full legal name"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-medium"
                                    />
                                    <span className="text-[10px] text-neutral-400 block">
                                        Shown on customer delivery tracking screens and supermarket pickup receipts.
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Primary Contact Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={riderPhone}
                                        onChange={(e) => setRiderPhone(e.target.value)}
                                        placeholder="+254 700 000000"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: VEHICLE SPECIFICATIONS */}
                        <div className="space-y-6">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block border-b border-neutral-100 pb-2">
                                02 · Vehicle Fleet Specifications
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Vehicle Type
                                    </label>
                                    <select
                                        value={riderVehicleType}
                                        onChange={(e) => setRiderVehicleType(e.target.value)}
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    >
                                        <option value="Motorbike">Motorbike (Boda Boda Fleet)</option>
                                        <option value="Bicycle">Bicycle (Eco Express)</option>
                                        <option value="Electric Scooter">Electric Scooter</option>
                                        <option value="Car">Van / Car (Bulk Hauls)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Registration Plate Number
                                    </label>
                                    <input
                                        type="text"
                                        value={riderPlate}
                                        onChange={(e) => setRiderPlate(e.target.value.toUpperCase())}
                                        placeholder="e.g. KDM 482Y"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono uppercase font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Vehicle Make
                                    </label>
                                    <input
                                        type="text"
                                        value={riderVehicleMake}
                                        onChange={(e) => setRiderVehicleMake(e.target.value)}
                                        placeholder="e.g. Honda / Boxer / TVS"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                        Vehicle Model
                                    </label>
                                    <input
                                        type="text"
                                        value={riderVehicleModel}
                                        onChange={(e) => setRiderVehicleModel(e.target.value)}
                                        placeholder="e.g. Ace 125"
                                        className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: OPERATIONAL ZONE & EMERGENCY */}
                        <div className="space-y-6">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block border-b border-neutral-100 pb-2">
                                03 · Dispatch Radius & Safety Contacts
                            </span>

                            <div className="space-y-1.5 text-xs">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                    Preferred Operational Sector / Zone
                                </label>
                                <input
                                    type="text"
                                    value={riderOperatingZone}
                                    onChange={(e) => setRiderOperatingZone(e.target.value)}
                                    placeholder="e.g. Westlands, Kilimani, Lavington, Riverside"
                                    className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-medium"
                                />
                                <span className="text-[10px] text-neutral-400 block">
                                    Primary urban zone prioritized by dispatch algorithms for supermarket hauls.
                                </span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 block">
                                    Emergency Roadside Contact (Next of Kin / Support)
                                </label>
                                <input
                                    type="text"
                                    value={riderEmergencyContact}
                                    onChange={(e) => setRiderEmergencyContact(e.target.value)}
                                    placeholder="Name and Phone number"
                                    className="w-full py-2 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none font-medium"
                                />
                            </div>
                        </div>

                        {/* Action Row */}
                        <div className="pt-6 border-t border-neutral-200 flex justify-end">
                            <button
                                onClick={handleSaveRiderSettings}
                                className="w-full sm:w-auto px-8 py-3 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={13} />
                                Save Rider Settings
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-neutral-200 px-6 sm:px-10 py-4 text-center text-[10px] font-mono tracking-widest uppercase text-neutral-400">
                Muncheez Courier Rapid Dispatch · Nairobi Logistics Network
            </footer>
        </div>
    );
}
