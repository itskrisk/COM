import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, HelpCircle, LogOut, FileText, X, Cookie, Shield, ArrowLeft, ArrowRight, Clock,
    ShoppingBag, MapPin, CreditCard, Heart, Bell, Lock, Compass, FileCode,
    Trash2, Check, Plus, Download, RefreshCw, ChevronRight, Save, Smartphone,
    AlertTriangle, CheckCircle
} from 'lucide-react';
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../../context/CartContext";
import { supabase } from '../../../lib/supabaseClient';
import { orderService, profileService, complaintService } from '../../../lib/supabaseService';
import { walletService } from '../../../lib/walletService';
import { mpesaService } from '../../../lib/mpesaService';
import CookieModal from './CookieModal';

type ModalView =
    | 'main'
    | 'profile'
    | 'orders'
    | 'addresses'
    | 'payments'
    | 'favorites'
    | 'notifications'
    | 'security'
    | 'privacy'
    | 'location'
    | 'support'
    | 'policies'
    | 'delete-account';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialView?: ModalView;
}

// No default mock data - show empty state if user has no data

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, initialView = 'main' }) => {
    const { user, profile, signOut, resetPassword, refreshUser } = useAuth();
    const navigate = useNavigate();
    const { addItem } = useCart();

    const [view, setView] = useState<ModalView>(initialView);

    useEffect(() => {
        if (isOpen) {
            setView(initialView || 'main');
        }
    }, [isOpen, initialView]);
    const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);

    // Profile Form State
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Real data from Supabase
    const [supabaseOrders, setSupabaseOrders] = useState<any[]>([]);
    const [supabaseAddresses, setSupabaseAddresses] = useState<any[]>([]);
    const [supabaseFavorites, setSupabaseFavorites] = useState<any[]>([]);
    const [supabaseNotifications, setSupabaseNotifications] = useState<any>({});
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Address Form State
    const [newAddrLabel, setNewAddrLabel] = useState('Home');
    const [newAddrText, setNewAddrText] = useState('');
    const [newAddrDoor, setNewAddrDoor] = useState('');
    const [newAddrNotes, setNewAddrNotes] = useState('');
    const [isAddingAddr, setIsAddingAddr] = useState(false);

    // Payment Methods State
    const [mpesaNumber, setMpesaNumber] = useState(profile?.phone || '');
const [walletBalance, setWalletBalance] = useState(0);
const [topUpOpen, setTopUpOpen] = useState(false);
const [topUpAmount, setTopUpAmount] = useState('');
const [topUpStatus, setTopUpStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
const [topUpError, setTopUpError] = useState('');
    const [defaultPayment, setDefaultPayment] = useState('MPESA');

    // Location Preferences State
    const [neighborhood, setNeighborhood] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');

    // Support Form State
    const [supportCategory, setSupportCategory] = useState('Order Issue');
    const [supportDetails, setSupportDetails] = useState('');

    // Policies Active Tab
    const [policyTab, setPolicyTab] = useState<'terms' | 'privacy' | 'refund' | 'delivery'>('terms');

    // Delete Account Confirmation State
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Load real data from Supabase
    useEffect(() => {
        if (!user?.id) return;

        const loadData = async () => {
            setIsLoadingData(true);
            try {
                // Load orders
                const ordersResult = await orderService.getOrders(user.id);
                if (ordersResult.data) {
                    setSupabaseOrders(ordersResult.data);
                }

                // Load profile extensions
                if (profile) {
                    setSupabaseAddresses(profile.addresses || []);
                    setSupabaseFavorites(profile.favorites || []);
                    setSupabaseNotifications(profile.notification_settings || {
                        orderStatus: true,
                        riderAlerts: true,
                        promotions: true,
                        marketing: false
                    });
                    setNeighborhood(profile.location_preferences?.neighborhood || '');
                    setDeliveryNotes(profile.location_preferences?.delivery_notes || '');
                }
                // Load wallet balance
                if (user?.id) {
                    const w = await walletService.getOrCreateWallet(user.id, 'CUSTOMER');
                    setWalletBalance(Number(w?.balance || 0));
                }
            } catch (err) {
                console.error('Error loading profile data:', err);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();
    }, [user?.id, profile]);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setPhone(profile.phone || '');
            if (profile.phone) setMpesaNumber(profile.phone);
        }
    }, [profile]);

    // Filter user orders from Supabase
    const myOrders = supabaseOrders.filter((o: any) =>
        o.customer_id === user?.id
    ).sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
    });

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        setFeedback(null);

        try {
            const { error: updateErr } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName.trim(),
                    phone: phone.trim() || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateErr) throw updateErr;

            await refreshUser();
            setFeedback({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setFeedback({ type: 'error', text: err.message || 'Failed to update profile' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTopUpWallet = async () => {
        if (!user) return;
        const amt = Number(topUpAmount);
        if (!amt || amt <= 0) { setTopUpError('Enter a valid amount greater than 0'); return; }
        setTopUpError('');
        setTopUpStatus('pending');
        try {
            const res = await mpesaService.initiateSTKPush({ phoneNumber: (mpesaNumber || profile?.phone || '').trim(), amount: amt, orderId: `TOPUP-${user.id}` });
            if (res.success) {
                setTopUpStatus('pending');
            } else {
                setTopUpStatus('failed');
                setTopUpError(res.error || 'Failed to dispatch STK push prompt.');
            }
        } catch (e: any) {
            setTopUpStatus('failed');
            setTopUpError(e.message || 'Network error');
        }
    };

    const refreshWallet = async () => {
        if (!user?.id) return;
        const w = await walletService.getOrCreateWallet(user.id, 'CUSTOMER');
        setWalletBalance(Number(w?.balance || 0));
    };
    const handleResetPassword = async () => {
        if (!user?.email) return;
        const { error } = await resetPassword(user.email);
        if (error) {
            setFeedback({ type: 'error', text: error });
        } else {
            setFeedback({ type: 'success', text: `Password reset email sent to ${user.email}` });
        }
    };

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAddrText.trim() || !user) return;
        const newAddr = {
            id: `addr-${Date.now()}`,
            label: newAddrLabel,
            fullAddress: newAddrText.trim(),
            doorNumber: newAddrDoor.trim() || 'N/A',
            instructions: newAddrNotes.trim() || 'None',
            isDefault: supabaseAddresses.length === 0
        };
        const updated = [newAddr, ...supabaseAddresses];
        setSupabaseAddresses(updated);
        setNewAddrText('');
        setNewAddrDoor('');
        setNewAddrNotes('');
        setIsAddingAddr(false);

        // Save to Supabase
        const { error } = await supabase
            .from('profiles')
            .update({ addresses: updated })
            .eq('id', user.id);

        if (error) {
            setFeedback({ type: 'error', text: 'Failed to save address' });
        } else {
            setFeedback({ type: 'success', text: 'Address saved successfully' });
        }
    };

    const handleSetDefaultAddress = async (id: string) => {
        if (!user) return;
        const updated = supabaseAddresses.map((a: any) => ({ ...a, isDefault: a.id === id }));
        setSupabaseAddresses(updated);

        const { error } = await supabase
            .from('profiles')
            .update({ addresses: updated })
            .eq('id', user.id);

        if (error) {
            setFeedback({ type: 'error', text: 'Failed to update default address' });
        } else {
            setFeedback({ type: 'success', text: 'Default delivery address updated' });
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!user) return;
        const updated = supabaseAddresses.filter((a: any) => a.id !== id);
        setSupabaseAddresses(updated);

        const { error } = await supabase
            .from('profiles')
            .update({ addresses: updated })
            .eq('id', user.id);

        if (error) {
            setFeedback({ type: 'error', text: 'Failed to delete address' });
        } else {
            setFeedback({ type: 'success', text: 'Address deleted' });
        }
    };

    const handleReorder = (orderItems: any[]) => {
        orderItems.forEach((item: any) => {
            addItem({
                id: item.id || `item-${Date.now()}`,
                merchantId: item.merchantId || 'm1',
                name: item.name,
                price: item.price,
                description: item.description || '',
                isAvailable: true,
                categoryId: item.category || 'general'
            }, item.quantity || 1);
        });
        setFeedback({ type: 'success', text: 'Items added to your cart!' });
    };

    const handleDownloadUserData = () => {
        const userData = {
            profile: {
                id: user?.id,
                email: user?.email,
                fullName: profile?.full_name,
                phone: profile?.phone
            },
            addresses: supabaseAddresses,
            favorites: supabaseFavorites,
            ordersCount: myOrders.length,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `muncheez_account_data_${user?.id?.slice(0, 8)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setFeedback({ type: 'success', text: 'Data archive downloaded' });
    };

    const handleSaveLocation = async () => {
        if (!user) return;
        const locationPrefs = { neighborhood, delivery_notes: deliveryNotes };
        const { error } = await supabase
            .from('profiles')
            .update({ location_preferences: locationPrefs })
            .eq('id', user.id);

        if (error) {
            setFeedback({ type: 'error', text: 'Failed to save location preferences' });
        } else {
            // Also update localStorage so navbar reflects immediately
            localStorage.setItem('muncheez_delivery_address', neighborhood);
            setFeedback({ type: 'success', text: 'Location preferences saved!' });
        }
    };

    const handleSupportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !supportDetails.trim()) return;

        try {
            const { error } = await supabase
                .from('complaints')
                .insert({
                    subject: supportCategory,
                    description: supportDetails,
                    filed_by: user.id,
                    status: 'OPEN',
                    priority: 'MEDIUM'
                });

            if (error) throw error;

            setFeedback({ type: 'success', text: 'Ticket #TK-' + Math.floor(1000 + Math.random() * 9000) + ' submitted. Our team will contact you shortly.' });
            setSupportDetails('');
        } catch (err: any) {
            setFeedback({ type: 'error', text: err.message || 'Failed to submit ticket' });
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
        if (!user) return;
        setIsSaving(true);
        try {
            // Delete profile data from Supabase
            await supabase.from('profiles').delete().eq('id', user.id);
            await signOut();
            onClose();
            window.location.href = '/';
        } catch (e) {
            console.error('Delete account error:', e);
            setFeedback({ type: 'error', text: 'Failed to delete account. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        onClose();
        navigate('/');
    };

    const initial = profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?';

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 sm:px-6 text-black font-sans">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        />

                        {/* Modal Dialog */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: "spring", stiffness: 320, damping: 28 }}
                            className="relative w-full max-w-md bg-white shadow-2xl border border-black/10 flex flex-col max-h-[85vh] h-[680px]"
                        >
                            {/* Header Bar */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white shrink-0 z-10">
                                {view !== 'main' ? (
                                    <button
                                        onClick={() => { setView('main'); setFeedback(null); }}
                                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black/60 hover:text-black transition-colors"
                                    >
                                        <ArrowLeft size={16} />
                                        Back
                                    </button>
                                ) : (
                                    <div className="text-xs font-black uppercase tracking-widest text-[#2563EB]">
                                        {user ? 'Customer Account' : 'Muncheez Account'}
                                    </div>
                                )}

                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                                >
                                    <X size={16} className="text-black/60" />
                                </button>
                            </div>

                            {/* Toast Notification Banner */}
                            {feedback && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`px-6 py-3 text-xs font-bold flex items-center gap-2 border-b shrink-0 ${
                                        feedback.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                                    }`}
                                >
                                    {feedback.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                    <span className="flex-1">{feedback.text}</span>
                                    <button onClick={() => setFeedback(null)} className="text-black/40 hover:text-black">
                                        <X size={12} />
                                    </button>
                                </motion.div>
                            )}

                            {/* Scrollable View Container */}
                            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                                <AnimatePresence mode="wait">

                                    {/* VIEW 1: OVERVIEW / MAIN HUB */}
                                    {view === 'main' && (
                                        <motion.div
                                            key="main"
                                            initial={{ opacity: 0, x: -15 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -15 }}
                                            className="space-y-6"
                                        >
                                            {!user ? (
                                                <div className="space-y-6 py-2">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#2563EB] block mb-2">
                                                            Account Access
                                                        </span>
                                                        <h2 className="text-2xl font-heading font-light text-gray-900 tracking-tight mb-2">
                                                            Welcome to Muncheez.
                                                        </h2>
                                                        <p className="text-xs text-gray-500 leading-relaxed">
                                                            Sign in to access your orders, track deliveries in real time, and manage your saved addresses.
                                                        </p>
                                                    </div>

                                                    <div className="space-y-3 pt-2">
                                                        <button
                                                            onClick={() => { onClose(); navigate('/login'); }}
                                                            className="w-full flex items-center justify-between py-4 px-6 bg-black text-white hover:bg-[#2563EB] transition-colors text-xs font-mono uppercase tracking-widest font-bold"
                                                        >
                                                            <span>Sign In</span>
                                                            <ArrowRight size={14} />
                                                        </button>

                                                        <button
                                                            onClick={() => { onClose(); navigate('/signup'); }}
                                                            className="w-full flex items-center justify-between py-4 px-6 border border-gray-200 text-gray-900 hover:border-black transition-colors text-xs font-mono uppercase tracking-widest font-bold"
                                                        >
                                                            <span>Create an Account</span>
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    </div>

                                                    <div className="border-t border-b border-gray-100 py-6 my-6">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-3">
                                                            Partner Portals
                                                        </span>
                                                        <div className="flex flex-col gap-2.5">
                                                            <button
                                                                onClick={() => { onClose(); navigate('/merchant/login'); }}
                                                                className="flex items-center justify-between text-xs font-medium text-gray-700 hover:text-[#2563EB] transition-colors py-1"
                                                            >
                                                                <span>Merchant Partner Portal</span>
                                                                <ChevronRight size={14} className="text-gray-300" />
                                                            </button>
                                                            <button
                                                                onClick={() => { onClose(); navigate('/rider/login'); }}
                                                                className="flex items-center justify-between text-xs font-medium text-gray-700 hover:text-[#2563EB] transition-colors py-1"
                                                            >
                                                                <span>Courier Fleet Terminal</span>
                                                                <ChevronRight size={14} className="text-gray-300" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="text-center pt-2">
                                                        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-400">
                                                            Fast. Fresh. Fam.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* User Profile Header — Apple-style editorial */}
                                                    <div className="flex items-center gap-4 pb-5 border-b border-black/5">
                                                        <div className="w-12 h-12 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center shrink-0">
                                                            <span className="text-sm font-medium tracking-tight leading-none select-none">
                                                                {profile?.full_name
                                                                    ? profile.full_name.split(' ').slice(0, 2).map((n: string) => n.charAt(0)).join('').toUpperCase()
                                                                    : initial}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 overflow-hidden">
                                                            <h3 className="font-sans font-semibold text-sm text-gray-900 truncate tracking-tight">
                                                                {profile?.full_name || 'Customer Account'}
                                                            </h3>
                                                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{user?.email}</p>
                                                        </div>
                                                    </div>

                                            {/* Quick Actions Grid */}
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2 px-1">
                                                    Quick Access
                                                </span>
                                                <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                    <button onClick={() => setView('orders')} className="w-full flex items-center gap-4 py-4 hover:bg-gray-50 transition-colors group text-left">
                                                        <div className="p-2.5 rounded-full bg-[#4A90E2]/10 text-[#4A90E2] group-hover:bg-[#4A90E2] group-hover:text-white transition-colors shrink-0">
                                                            <ShoppingBag size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-bold text-gray-900">My Orders</div>
                                                            <div className="text-[10px] text-gray-400 font-medium">{myOrders.length} orders</div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                                    </button>

                                                    <button onClick={() => setView('addresses')} className="w-full flex items-center gap-4 py-4 hover:bg-gray-50 transition-colors group text-left">
                                                        <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                                                            <MapPin size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-bold text-gray-900">Addresses</div>
                                                            <div className="text-[10px] text-gray-400 font-medium">{supabaseAddresses.length} saved</div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                                    </button>

                                                    <button onClick={() => setView('payments')} className="w-full flex items-center gap-4 py-4 hover:bg-gray-50 transition-colors group text-left">
                                                        <div className="p-2.5 rounded-full bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                                                            <CreditCard size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-bold text-gray-900">Payments</div>
                                                            <div className="text-[10px] text-gray-400 font-medium">M-Pesa</div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                                    </button>

                                                    <button onClick={() => setView('favorites')} className="w-full flex items-center gap-4 py-4 hover:bg-gray-50 transition-colors group text-left">
                                                        <div className="p-2.5 rounded-full bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                                                            <Heart size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-bold text-gray-900">Favorites</div>
                                                            <div className="text-[10px] text-gray-400 font-medium">{supabaseFavorites.length} saved</div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Categorized Menu Options */}
                                            <div className="space-y-4">
                                                {/* SECTION: ACCOUNT */}
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2 px-1">
                                                        Account
                                                    </span>
                                                    <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                        <button onClick={() => setView('profile')} className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <User size={16} className="text-gray-400 group-hover:text-[#4A90E2]" />
                                                                <span className="text-xs font-bold text-gray-800">My Profile</span>
                                                            </div>
                                                            <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                        </button>

                                                        <button onClick={() => setView('notifications')} className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <Bell size={16} className="text-gray-400 group-hover:text-[#4A90E2]" />
                                                                <span className="text-xs font-bold text-gray-800">Notifications</span>
                                                            </div>
                                                            <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                        </button>

                                                        <button onClick={() => setView('security')} className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <Lock size={16} className="text-gray-400 group-hover:text-[#4A90E2]" />
                                                                <span className="text-xs font-bold text-gray-800">Security</span>
                                                            </div>
                                                            <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                        </button>

                                                        <button onClick={() => setView('privacy')} className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <Shield size={16} className="text-gray-400 group-hover:text-[#4A90E2]" />
                                                                <span className="text-xs font-bold text-gray-800">Privacy & Data</span>
                                                            </div>
                                                            <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* SECTION: PREFERENCES */}
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2 px-1">
                                                        Preferences
                                                    </span>
                                                    <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                        <button onClick={() => setView('location')} className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <Compass size={16} className="text-gray-400 group-hover:text-[#4A90E2]" />
                                                                <span className="text-xs font-bold text-gray-800">Location Preferences</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-[#4A90E2]">{neighborhood || 'Not set'}</span>
                                                        </button>

                                                        <button onClick={() => setIsCookieModalOpen(true)} className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <Cookie size={16} className="text-gray-400 group-hover:text-[#4A90E2]" />
                                                                <span className="text-xs font-bold text-gray-800">Cookie Settings</span>
                                                            </div>
                                                            <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* SECTION: SUPPORT */}
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2 px-1">
                                                        Support
                                                    </span>
                                                    <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                        <button onClick={() => setView('support')} className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <HelpCircle size={16} className="text-gray-400 group-hover:text-[#4A90E2]" />
                                                                <span className="text-xs font-bold text-gray-800">Help & Support</span>
                                                            </div>
                                                            <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                        </button>

                                                        <button onClick={() => setView('policies')} className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <FileCode size={16} className="text-gray-400 group-hover:text-[#4A90E2]" />
                                                                <span className="text-xs font-bold text-gray-800">Terms & Policies</span>
                                                            </div>
                                                            <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* SECTION: ACTIONS */}
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2 px-1">
                                                        Account Actions
                                                    </span>
                                                    <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                        <button onClick={handleLogout} className="w-full flex items-center justify-between p-3.5 hover:bg-red-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <LogOut size={16} className="text-red-500" />
                                                                <span className="text-xs font-bold text-red-600">Log Out</span>
                                                            </div>
                                                        </button>

                                                        <button onClick={() => setView('delete-account')} className="w-full flex items-center justify-between p-3.5 hover:bg-red-50 transition-colors text-left group">
                                                            <div className="flex items-center gap-3">
                                                                <Trash2 size={16} className="text-red-400 group-hover:text-red-600" />
                                                                <span className="text-xs font-bold text-red-500 group-hover:text-red-700">Delete Account</span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            </div>)}
                                        </motion.div>
                                    )}

                                    {/* VIEW 2: MY PROFILE */}
                                    {view === 'profile' && (
                                        <motion.div key="profile" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">My Profile</h3>

                                            <form onSubmit={handleSaveProfile} className="space-y-7">
                                                <div className="space-y-7">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Full Name</label>
                                                        <input
                                                            type="text"
                                                            value={fullName}
                                                            onChange={(e) => setFullName(e.target.value)}
                                                            className="w-full bg-transparent border-b border-gray-200 px-0 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#4A90E2] transition-colors"
                                                            placeholder="Your Name"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Email Address (Read Only)</label>
                                                        <input
                                                            type="text"
                                                            disabled
                                                            value={user?.email || ''}
                                                            className="w-full bg-transparent border-b border-gray-100 px-0 py-2.5 text-xs font-bold text-gray-400 cursor-not-allowed"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Phone Number</label>
                                                        <input
                                                            type="text"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                            className="w-full bg-transparent border-b border-gray-200 px-0 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#4A90E2] transition-colors"
                                                            placeholder="+254 700 000 000"
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={isSaving}
                                                    className="w-full py-4 bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Save size={14} />
                                                    {isSaving ? 'Saving...' : 'Save Profile Changes'}
                                                </button>
                                            </form>
                                        </motion.div>
                                    )}

                                    {/* VIEW 3: MY ORDERS */}
                                    {view === 'orders' && (
                                        <motion.div key="orders" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">My Orders</h3>
                                            {myOrders.length === 0 ? (
                                                <div className="text-center py-12 border-t border-b border-gray-100">
                                                    <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
                                                    <p className="font-bold text-sm text-gray-500">No active or past orders</p>
                                                    <p className="text-xs text-gray-400 mt-1">Explore restaurants and shops to place your first order!</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                    {myOrders.map((order) => (
                                                        <div key={order.id} className="py-5 space-y-3">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <span className="text-[10px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                        #{order.id.slice(0, 8)}
                                                                    </span>
                                                                    <h4 className="font-bold text-sm text-gray-900 mt-1">
                                                                        {order.items?.[0]?.name || 'Order'} {order.items?.length > 1 && `+${order.items.length - 1} more`}
                                                                    </h4>
                                                                </div>
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                    order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                    {order.status}
                                                                </span>
                                                            </div>

                                                            <div className="flex justify-between items-center text-xs pt-1">
                                                                <span className="text-gray-400 font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                                                                <span className="font-black text-[#4A90E2]">KES {Number(order.total).toLocaleString()}</span>
                                                            </div>

                                                            <div className="flex gap-2 pt-1">
                                                                <button
                                                                    onClick={() => handleReorder(order.items)}
                                                                    className="flex-1 py-2.5 bg-black/5 hover:bg-black/10 text-black text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-1.5"
                                                                >
                                                                    <RefreshCw size={12} />
                                                                    Reorder
                                                                </button>
                                                                <button
                                                                    onClick={() => { onClose(); navigate(`/order/${order.id}`); }}
                                                                    className="flex-1 py-2.5 bg-[#4A90E2] text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[#357ABD] transition-colors flex items-center justify-center gap-1.5"
                                                                >
                                                                    Track Status
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* VIEW 4: SAVED ADDRESSES */}
                                    {view === 'addresses' && (
                                        <motion.div key="addresses" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-heading font-black text-lg text-gray-900">Saved Addresses</h3>
                                                <button
                                                    onClick={() => setIsAddingAddr(!isAddingAddr)}
                                                    className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gray-800 transition-colors flex items-center gap-1"
                                                >
                                                    <Plus size={14} />
                                                    Add
                                                </button>
                                            </div>

                                            {/* Add Address Form */}
                                            {isAddingAddr && (
                                                <form onSubmit={handleAddAddress} className="border-t border-b border-[#4A90E2]/30 py-5 space-y-5">
                                                    <div className="flex gap-2">
                                                        {['Home', 'Work', 'Other'].map(lbl => (
                                                            <button
                                                                key={lbl}
                                                                type="button"
                                                                onClick={() => setNewAddrLabel(lbl)}
                                                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${newAddrLabel === lbl ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}
                                                            >
                                                                {lbl}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Full Address / Building Name"
                                                        value={newAddrText}
                                                        onChange={e => setNewAddrText(e.target.value)}
                                                        className="w-full bg-transparent border-b border-gray-200 px-0 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#4A90E2] transition-colors"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Apt / Door Number (e.g. 4B)"
                                                        value={newAddrDoor}
                                                        onChange={e => setNewAddrDoor(e.target.value)}
                                                        className="w-full bg-transparent border-b border-gray-200 px-0 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#4A90E2] transition-colors"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Delivery Notes (e.g. Leave with gate guard)"
                                                        value={newAddrNotes}
                                                        onChange={e => setNewAddrNotes(e.target.value)}
                                                        className="w-full bg-transparent border-b border-gray-200 px-0 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#4A90E2] transition-colors"
                                                    />
                                                    <div className="flex gap-2 pt-1">
                                                        <button type="submit" className="flex-1 py-3 bg-[#4A90E2] text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[#357ABD] transition-colors">Save Address</button>
                                                        <button type="button" onClick={() => setIsAddingAddr(false)} className="px-4 py-3 border border-gray-200 text-xs font-bold rounded-full hover:border-gray-400 transition-colors">Cancel</button>
                                                    </div>
                                                </form>
                                            )}

                                            {/* Addresses List */}
                                            <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                {supabaseAddresses.map((addr: any) => (
                                                    <div key={addr.id} className={`py-5 space-y-2 ${addr.isDefault ? 'border-l-2 border-l-[#4A90E2] pl-4' : ''}`}>
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black uppercase tracking-wider text-gray-900">{addr.label}</span>
                                                                {addr.isDefault && <span className="px-2 py-0.5 bg-[#4A90E2]/10 text-[#4A90E2] text-[9px] font-black uppercase tracking-wider rounded-full">Default</span>}
                                                            </div>
                                                            <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-gray-600 font-medium leading-relaxed">{addr.fullAddress}</p>
                                                        {addr.instructions && <p className="text-[10px] text-gray-400 font-medium italic">Note: {addr.instructions}</p>}
                                                        {!addr.isDefault && (
                                                            <button
                                                                onClick={() => handleSetDefaultAddress(addr.id)}
                                                                className="text-[10px] font-bold text-[#4A90E2] uppercase tracking-wider hover:underline pt-1"
                                                            >
                                                                Set as Default
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* VIEW 5: PAYMENT METHODS */}
                                    {view === 'payments' && (
                                        <motion.div key="payments" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">Payment Methods</h3>

                                            <div className="border border-gray-200 p-4 flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Muncheez Wallet</div>
                                                    <div className="text-lg font-bold text-gray-900">KES {walletBalance.toLocaleString()}</div>
                                                </div>
                                                <button onClick={() => { setTopUpOpen(true); setTopUpStatus('idle'); setTopUpError(''); setTopUpAmount(''); }} className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800">
                                                    Top Up
                                                </button>
                                                <button onClick={refreshWallet} className="px-3 py-2 border border-gray-200 text-xs font-bold uppercase tracking-widest hover:bg-gray-50">
                                                    Refresh
                                                </button>
                                            </div>

                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Default Payment Option</label>
                                                    <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                        {[
                                                            { id: 'MPESA', name: 'M-Pesa STK Push', desc: 'Instant mobile payment' },
                                                            { id: 'CASH', name: 'Cash on Delivery', desc: 'Pay rider directly upon receipt' },
                                                            { id: 'CARD', name: 'Debit / Credit Card', desc: 'Visa & Mastercard supported' }
                                                        ].map(pm => (
                                                            <button
                                                                key={pm.id}
                                                                type="button"
                                                                onClick={() => setDefaultPayment(pm.id)}
                                                                className={`w-full py-4 flex items-center justify-between transition-all text-left ${defaultPayment === pm.id ? 'border-l-2 border-l-[#4A90E2] pl-3 bg-[#4A90E2]/5' : 'hover:bg-gray-50'}`}
                                                            >
                                                                <div>
                                                                    <div className="text-xs font-bold text-gray-900">{pm.name}</div>
                                                                    <div className="text-[10px] text-gray-400">{pm.desc}</div>
                                                                </div>
                                                                {defaultPayment === pm.id && <Check size={16} className="text-[#4A90E2]" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">M-Pesa Phone Number</label>
                                                    <div className="flex items-center gap-3 border-b border-gray-200 focus-within:border-[#4A90E2] transition-colors">
                                                        <Smartphone size={16} className="text-gray-400 shrink-0" />
                                                        <input
                                                            type="text"
                                                            value={mpesaNumber}
                                                            onChange={e => setMpesaNumber(e.target.value)}
                                                            className="w-full bg-transparent py-2.5 text-xs font-bold text-gray-900 focus:outline-none"
                                                            placeholder="+254 700 000 000"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (!user) return;
                                                            try {
                                                                const { error } = await supabase
                                                                    .from('profiles')
                                                                    .update({ phone: mpesaNumber.trim() || null })
                                                                    .eq('id', user.id);
                                                                if (error) throw error;
                                                                await refreshUser();
                                                                setFeedback({ type: 'success', text: 'M-Pesa phone number updated!' });
                                                            } catch (err: any) {
                                                                setFeedback({ type: 'error', text: err.message || 'Failed to update M-Pesa number' });
                                                            }
                                                        }}
                                                        className="w-full py-4 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                                                    >
                                                        Save M-Pesa Number
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* VIEW 6: FAVORITES */}
                                    {view === 'favorites' && (
                                        <motion.div key="favorites" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">Favorites</h3>
                                            <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                {supabaseFavorites.map((fav: any) => (
                                                    <div key={fav.id} className="py-4 flex justify-between items-center">
                                                        <div>
                                                            <h4 className="font-bold text-xs text-gray-900">{fav.name}</h4>
                                                            <p className="text-[10px] text-gray-400 font-medium">{fav.category} • Rating: {fav.rating}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => { onClose(); navigate(fav.path); }}
                                                                className="px-3 py-1.5 bg-[#4A90E2] text-white text-xs font-bold rounded-full uppercase tracking-wider hover:bg-[#357ABD] transition-colors"
                                                            >
                                                                Visit
                                                            </button>
<button
                                                                    onClick={async () => {
                                                                        if (!user) return;
                                                                        const updated = supabaseFavorites.filter((f: any) => f.id !== fav.id);
                                                                        setSupabaseFavorites(updated);
                                                                        try {
                                                                            const { error } = await supabase
                                                                                .from('profiles')
                                                                                .update({ favorites: updated })
                                                                                .eq('id', user.id);
                                                                            if (error) throw error;
                                                                            setFeedback({ type: 'success', text: 'Favorite removed' });
                                                                        } catch (err: any) {
                                                                            setFeedback({ type: 'error', text: 'Failed to remove favorite' });
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* VIEW 7: NOTIFICATIONS */}
                                    {view === 'notifications' && (
                                        <motion.div key="notifications" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">Notifications</h3>
<div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                    {[
                                                        { key: 'orderStatus', title: 'Order Status Updates', desc: 'Real-time alerts when kitchen accepts order' },
                                                        { key: 'riderAlerts', title: 'Rider Location Alerts', desc: 'SMS updates when courier is nearby' },
                                                        { key: 'promotions', title: 'Promotions & Offers', desc: 'Exclusive weekly discounts & vouchers' },
                                                        { key: 'marketing', title: 'Marketing Newsletter', desc: 'New restaurant launches in Nairobi' }
                                                    ].map(item => (
                                                        <div key={item.key} className="py-4 flex items-center justify-between">
                                                            <div className="pr-4">
                                                                <div className="text-xs font-bold text-gray-900">{item.title}</div>
                                                                <div className="text-[10px] text-gray-400">{item.desc}</div>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={(supabaseNotifications as any)[item.key]}
                                                                onChange={e => setSupabaseNotifications({ ...supabaseNotifications, [item.key]: e.target.checked })}
                                                                className="w-4 h-4 accent-black cursor-pointer"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (!user) return;
                                                        try {
                                                            const { error } = await supabase
                                                                .from('profiles')
                                                                .update({ notification_settings: supabaseNotifications })
                                                                .eq('id', user.id);
                                                            if (error) throw error;
                                                            setFeedback({ type: 'success', text: 'Notification preferences saved!' });
                                                        } catch (err: any) {
                                                            setFeedback({ type: 'error', text: 'Failed to save notifications' });
                                                        }
                                                    }}
                                                    className="w-full py-4 mt-4 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                                                >
                                                    Save Notification Preferences
                                                </button>
                                        </motion.div>
                                    )}

                                    {/* VIEW 8: SECURITY */}
                                    {view === 'security' && (
                                        <motion.div key="security" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">Security</h3>
                                            <div className="space-y-6">
                                                <div className="space-y-4">
                                                    <div className="text-xs font-bold text-gray-900">Password Management</div>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                                        Trigger a secure password reset link sent directly to <strong>{user?.email}</strong>.
                                                    </p>
                                                    <button
                                                        onClick={handleResetPassword}
                                                        className="w-full py-3.5 border border-black text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
                                                    >
                                                        Send Password Reset Email
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="text-xs font-bold text-gray-900">Active Login Sessions</div>
                                                    <div className="py-3 border-y border-gray-100 flex items-center justify-between text-xs">
                                                        <div>
                                                            <div className="font-bold text-gray-800">Current Web Session</div>
                                                            <div className="text-[10px] text-gray-400">Windows Chrome • Active Now</div>
                                                        </div>
                                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                    </div>
                                                    <button
                                                        onClick={() => setFeedback({ type: 'success', text: 'Logged out of all other active browser sessions' })}
                                                        className="w-full py-3.5 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
                                                    >
                                                        Sign Out Other Devices
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* VIEW 9: PRIVACY */}
                                    {view === 'privacy' && (
                                        <motion.div key="privacy" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">Privacy & Data</h3>
                                            <div className="space-y-4">
                                                <div className="text-xs font-bold text-gray-900">Data Archive Request</div>
                                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                                    Download a full copy of your personal data, order history, and saved addresses in JSON format.
                                                </p>
                                                <button
                                                    onClick={handleDownloadUserData}
                                                    className="w-full py-4 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                                                >
                                                    <Download size={14} />
                                                    Download My Personal Data
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* VIEW 10: LOCATION PREFERENCES */}
                                    {view === 'location' && (
                                        <motion.div key="location" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">Location Preferences</h3>
                                            <div className="space-y-7">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Default Neighborhood</label>
                                                    <select
                                                        value={neighborhood}
                                                        onChange={e => setNeighborhood(e.target.value)}
                                                        className="w-full bg-transparent border-b border-gray-200 px-0 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#4A90E2] transition-colors"
                                                    >
                                                        {['Lavington', 'Kilimani', 'Westlands', 'Kileleshwa', 'Karen', 'Nairobi CBD', 'Runda', 'Gigiri'].map(loc => (
                                                            <option key={loc} value={loc}>{loc}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Global Delivery Instructions</label>
                                                    <textarea
                                                        rows={3}
                                                        value={deliveryNotes}
                                                        onChange={e => setDeliveryNotes(e.target.value)}
                                                        placeholder="e.g. Leave with gate security / Ring doorbell"
                                                        className="w-full bg-transparent border-b border-gray-200 px-0 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#4A90E2] transition-colors resize-none"
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleSaveLocation}
                                                    className="w-full py-4 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                                                >
                                                    Save Location Preferences
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* VIEW 11: HELP & SUPPORT */}
                                    {view === 'support' && (
                                        <motion.div key="support" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">Help & Support</h3>
                                            <form onSubmit={handleSupportSubmit} className="space-y-6">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Issue Category</label>
                                                    <select
                                                        value={supportCategory}
                                                        onChange={e => setSupportCategory(e.target.value)}
                                                        className="w-full bg-transparent border-b border-gray-200 px-0 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#4A90E2] transition-colors"
                                                    >
                                                        <option value="Order Issue">Order Issue / Missing Item</option>
                                                        <option value="Payment Problem">Payment Problem / M-Pesa</option>
                                                        <option value="Delivery Delay">Delivery Delay</option>
                                                        <option value="Account Query">Account Query</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Details</label>
                                                    <textarea
                                                        required
                                                        rows={3}
                                                        value={supportDetails}
                                                        onChange={e => setSupportDetails(e.target.value)}
                                                        placeholder="Describe your inquiry or order problem..."
                                                        className="w-full bg-transparent border-b border-gray-200 px-0 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#4A90E2] transition-colors resize-none"
                                                    />
                                                </div>

                                                <button type="submit" className="w-full py-4 bg-[#4A90E2] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#357ABD] transition-colors">
                                                    Submit Ticket
                                                </button>
                                            </form>
                                        </motion.div>
                                    )}

                                    {/* VIEW 12: TERMS & POLICIES */}
                                    {view === 'policies' && (
                                        <motion.div key="policies" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <h3 className="font-heading font-black text-lg text-gray-900">Terms & Policies</h3>
                                            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                                                {(['terms', 'privacy', 'refund', 'delivery'] as const).map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setPolicyTab(t)}
                                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider capitalize whitespace-nowrap ${policyTab === t ? 'bg-black text-white' : 'bg-white text-gray-600 border'}`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="py-4 border-t border-b border-gray-100 text-xs text-gray-600 space-y-2 leading-relaxed max-h-60 overflow-y-auto">
                                                {policyTab === 'terms' && <p>By using Muncheez, you agree to comply with our delivery network rules and fair use customer policies across Nairobi.</p>}
                                                {policyTab === 'privacy' && <p>We safeguard your location and personal contact data in compliance with Kenya Data Protection Act regulations.</p>}
                                                {policyTab === 'refund' && <p>Orders cancelled prior to kitchen preparation are refunded instantly to your original payment method within 2 hours.</p>}
                                                {policyTab === 'delivery' && <p>Deliveries are fulfilled within 25–45 minutes depending on traffic and driver availability in your zone.</p>}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* VIEW 13: DELETE ACCOUNT */}
                                    {view === 'delete-account' && (
                                        <motion.div key="delete-account" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-4">
                                            <div className="py-4 border-t border-b border-red-200 text-red-700 space-y-2">
                                                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-red-800">
                                                    <AlertTriangle size={16} />
                                                    Danger Zone: Delete Account
                                                </div>
                                                <p className="text-[10px] leading-relaxed">
                                                    Permanently delete your profile, saved addresses, order history, and favorites. This action cannot be undone.
                                                </p>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                                                    Type "DELETE" to confirm
                                                </label>
                                                <input
                                                    type="text"
                                                    value={deleteConfirmText}
                                                    onChange={e => setDeleteConfirmText(e.target.value)}
                                                    placeholder="DELETE"
                                                    className="w-full bg-transparent border-b border-gray-200 px-0 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-red-600 transition-colors"
                                                />
                                                <button
                                                    onClick={handleDeleteAccount}
                                                    disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isSaving}
                                                    className="w-full py-4 bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-40 transition-opacity hover:bg-red-700"
                                                >
                                                    Permanently Delete Account
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {topUpOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setTopUpOpen(false)} />
                    <div className="relative bg-white p-6 w-full max-w-sm space-y-4 text-black">
                        <h3 className="text-lg font-bold">Top Up Wallet</h3>
                        <input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="Amount (KES)" className="w-full border-b border-gray-200 py-2 text-sm text-black" />
                        {topUpError && <p className="text-red-600 text-xs">{topUpError}</p>}
                        <p className="text-xs text-gray-500">Status: {topUpStatus}</p>
                        <div className="flex gap-2">
                            <button onClick={handleTopUpWallet} className="flex-1 bg-black text-white py-2 text-xs font-bold uppercase">Continue</button>
                            <button onClick={() => setTopUpOpen(false)} className="flex-1 border border-gray-200 py-2 text-xs font-bold uppercase text-black">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <CookieModal
                isOpen={isCookieModalOpen}
                onClose={() => setIsCookieModalOpen(false)}
            />
        </>
    );
};

export default ProfileModal;
