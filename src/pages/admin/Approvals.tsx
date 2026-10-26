import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { adminSupabase } from '../../lib/adminSupabase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Store,
    Bike,
    User,
    Search,
    Filter,
    FileText,
    ExternalLink,
    AlertTriangle,
    Pause,
    Trash2
} from 'lucide-react';

type Tab = 'merchants' | 'riders';
type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ALL';

interface Merchant {
    id: string;
    business_name: string;
    type: string;
    status: string;
    logo_url?: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    owner_name?: string;
    kra_pin?: string;
    health_permit?: string;
    business_permit_url?: string;
    kra_pin_url?: string;
    health_permit_url?: string;
    mpesa_till?: string;
    documents?: Record<string, any> | null;
    created_at: string;
    profile?: {
        full_name?: string;
        phone?: string;
        email?: string;
    };
}

interface Rider {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    national_id?: string;
    mpesa_phone?: string;
    vehicle_type: string;
    status: string;
    is_online: boolean;
    vehicle_plate?: string;
    has_id_doc: boolean;
    has_license: boolean;
    has_logbook: boolean;
    has_helmet: boolean;
    has_thermal_bag: boolean;
    has_vest: boolean;
    id_doc_url?: string;
    license_url?: string;
    logbook_url?: string;
    insurance_url?: string;
    documents?: Record<string, any> | null;
    created_at: string;
    profile?: {
        full_name?: string;
        phone?: string;
        email?: string;
    };
}

export default function Approvals() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('merchants');
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<Status>('PENDING');
    const [processing, setProcessing] = useState<string | null>(null);
    const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
    const [expandedRider, setExpandedRider] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'merchants') {
                // Fetch merchants using adminSupabase (elevated privileges to see all applications)
                const { data: merchantsData, error: mErr } = await adminSupabase
                    .from('merchants')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (mErr) {
                    console.error('Approvals: error loading merchants:', mErr);
                }

                let combinedMerchants = merchantsData || [];

                // Fetch owner profiles for these merchants
                const userIds = combinedMerchants.map((m: any) => m.id).filter(Boolean);
                if (userIds.length > 0) {
                    const { data: profilesData } = await adminSupabase
                        .from('profiles')
                        .select('id, full_name, phone')
                        .in('id', userIds);

                    const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
                    combinedMerchants = combinedMerchants.map((m: any) => ({
                        ...m,
                        owner_name: m.owner_name || profileMap.get(m.id)?.full_name || 'Owner',
                        phone: m.phone || profileMap.get(m.id)?.phone || '',
                        // email is saved directly to merchants table by onboarding — use it directly
                        email: m.email || '',
                        profile: profileMap.get(m.id)
                    }));
                }

                let filtered = combinedMerchants;
                if (statusFilter !== 'ALL') {
                    filtered = combinedMerchants.filter((m: any) => {
                        const s = (m.status || '').toUpperCase();
                        if (statusFilter === 'PENDING') {
                            return s === 'PENDING' || s === 'UNDER_REVIEW' || s === 'PENDING_APPROVAL' || !m.status;
                        }
                        if (statusFilter === 'SUSPENDED') {
                            return s === 'SUSPENDED' || m.is_suspended === true;
                        }
                        return s === statusFilter;
                    });
                }

                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    filtered = filtered.filter((m: any) =>
                        m.business_name?.toLowerCase().includes(q) ||
                        m.owner_name?.toLowerCase().includes(q) ||
                        m.phone?.includes(q) ||
                        m.email?.toLowerCase().includes(q)
                    );
                }

                setMerchants(filtered as Merchant[]);
            } else {
                // Fetch riders using adminSupabase
                const { data: ridersData, error: rErr } = await adminSupabase
                    .from('riders')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (rErr) {
                    console.error('Approvals: error loading riders:', rErr);
                }

                let combinedRiders = ridersData || [];

                const riderIds = combinedRiders.map((r: any) => r.id).filter(Boolean);
                if (riderIds.length > 0) {
                    const { data: profilesData } = await adminSupabase
                        .from('profiles')
                        .select('id, full_name, phone')
                        .in('id', riderIds);

                    const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
                    combinedRiders = combinedRiders.map((r: any) => ({
                        ...r,
                        name: r.name || profileMap.get(r.id)?.full_name || 'Rider',
                        phone: r.phone || profileMap.get(r.id)?.phone || '',
                        email: r.email || profileMap.get(r.id)?.email || '',
                        profile: profileMap.get(r.id)
                    }));
                }

                let filtered = combinedRiders;
                if (statusFilter !== 'ALL') {
                    filtered = combinedRiders.filter((r: any) => {
                        const s = (r.status || '').toUpperCase();
                        if (statusFilter === 'PENDING') {
                            return s === 'PENDING' || s === 'UNDER_REVIEW' || s === 'PENDING_APPROVAL' || !r.status;
                        }
                        if (statusFilter === 'SUSPENDED') {
                            return s === 'SUSPENDED' || r.is_suspended === true;
                        }
                        return s === statusFilter;
                    });
                }

                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    filtered = filtered.filter((r: any) =>
                        r.vehicle_type?.toLowerCase().includes(q) ||
                        r.name?.toLowerCase().includes(q) ||
                        r.national_id?.toLowerCase().includes(q) ||
                        r.phone?.includes(q)
                    );
                }

                setRiders(filtered as Rider[]);
            }
        } catch (err) {
            console.error('Error loading approvals data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (processing) return;
        setProcessing(id);
        try {
            const table = activeTab === 'merchants' ? 'merchants' : 'riders';
            // Approval grants authorization to operate and automatically activates the store
            const updatePayload = activeTab === 'merchants'
                ? {
                    status: 'APPROVED',
                    is_active: true,
                    is_suspended: false,
                    approved_at: new Date().toISOString(),
                    rejection_reason: null
                  }
                : {
                    status: 'APPROVED',
                    is_suspended: false,
                    approved_at: new Date().toISOString()
                  };

            const { error } = await adminSupabase
                .from(table)
                .update(updatePayload)
                .eq('id', id);

            if (error) throw error;

            // Sync profile status AND account_status so user is authorized for dashboard
            await adminSupabase.from('profiles').update({
                status: 'APPROVED',
                account_status: 'active'
            }).eq('id', id);

            await loadData();
        } catch (err) {
            console.error('Error approving:', err);
            alert('Failed to approve application. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (id: string) => {
        if (processing) return;
        const reason = window.prompt('Enter rejection reason (optional):', 'Application does not meet onboarding compliance requirements.') || 'Application rejected.';
        setProcessing(id);
        try {
            const table = activeTab === 'merchants' ? 'merchants' : 'riders';
            const updatePayload = activeTab === 'merchants'
                ? {
                    status: 'REJECTED',
                    is_active: false,
                    rejection_reason: reason
                  }
                : {
                    status: 'REJECTED',
                    is_online: false
                  };

            const { error } = await adminSupabase
                .from(table)
                .update(updatePayload)
                .eq('id', id);

            if (error) throw error;

            await adminSupabase.from('profiles').update({
                status: 'REJECTED',
                account_status: 'rejected'
            }).eq('id', id);

            await loadData();
        } catch (err) {
            console.error('Error rejecting:', err);
            alert('Failed to reject application. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const handleSuspend = async (id: string) => {
        if (processing) return;
        setProcessing(id);
        try {
            const table = activeTab === 'merchants' ? 'merchants' : 'riders';
            // Suspending takes store offline immediately and revokes operational status
            const updatePayload = activeTab === 'merchants'
                ? {
                    status: 'SUSPENDED',
                    is_suspended: true,
                    is_active: false,
                    suspended_at: new Date().toISOString()
                  }
                : {
                    status: 'SUSPENDED',
                    is_suspended: true,
                    is_online: false,
                    suspended_at: new Date().toISOString()
                  };

            const { error } = await adminSupabase
                .from(table)
                .update(updatePayload)
                .eq('id', id);

            if (error) throw error;

            await adminSupabase.from('profiles').update({
                status: 'SUSPENDED',
                account_status: 'suspended'
            }).eq('id', id);

            await loadData();
        } catch (err) {
            console.error('Error suspending:', err);
            alert('Failed to suspend account. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const handleUnsuspend = async (id: string) => {
        if (processing) return;
        setProcessing(id);
        try {
            const table = activeTab === 'merchants' ? 'merchants' : 'riders';
            // Unsuspending restores eligibility for publication (status: APPROVED).
            // It NEVER automatically forces an Offline store online (is_active is left unchanged).
            const updatePayload = activeTab === 'merchants'
                ? {
                    status: 'APPROVED',
                    is_suspended: false,
                    suspended_at: null
                  }
                : {
                    status: 'APPROVED',
                    is_suspended: false,
                    suspended_at: null
                  };

            const { error } = await adminSupabase
                .from(table)
                .update(updatePayload)
                .eq('id', id);

            if (error) throw error;

            await adminSupabase.from('profiles').update({
                status: 'APPROVED',
                account_status: 'active'
            }).eq('id', id);

            await loadData();
        } catch (err) {
            console.error('Error unsuspending:', err);
            alert('Failed to unsuspend account. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const handleDelete = async (id: string, type: 'merchant' | 'rider') => {
        if (processing) return;
        const confirmed = window.confirm(
            'PERMANENT DELETE: This will remove all data for this application including documents. This cannot be undone. Continue?'
        );
        if (!confirmed) return;

        setProcessing(id);
        try {
            const table = type === 'merchant' ? 'merchants' : 'riders';

            // Delete products if merchant
            if (type === 'merchant') {
                await adminSupabase.from('products').delete().eq('merchant_id', id);
            }

            // Clean up storage documents
            try {
                const { data: storageFiles } = await adminSupabase.storage
                    .from('documents')
                    .list(`${table}/${id}`);
                if (storageFiles && storageFiles.length > 0) {
                    const filePaths = storageFiles.map((f: any) => `${table}/${id}/${f.name}`);
                    await adminSupabase.storage.from('documents').remove(filePaths);
                }
            } catch (storageErr) {
                console.warn('Storage cleanup partial failure (non-fatal):', storageErr);
            }

            // Delete main record
            const { error: deleteErr } = await adminSupabase.from(table).delete().eq('id', id);
            if (deleteErr) throw deleteErr;

            // Delete profile
            await adminSupabase.from('profiles').delete().eq('id', id);

            await loadData();
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Failed to delete. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 text-amber-700';
            case 'APPROVED': return 'bg-green-100 text-green-700';
            case 'REJECTED': return 'bg-red-100 text-red-700';
            case 'SUSPENDED': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const renderDocumentLink = (url: string | undefined, label: string) => {
        if (!url) return null;
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium min-h-[44px]"
            >
                <FileText size={16} />
                <span>{label}</span>
                <ExternalLink size={14} />
            </a>
        );
    };

    const extractDocUrl = (val: any): string | null => {
        if (!val) return null;
        if (typeof val === 'string') return (val.startsWith('http') || val.startsWith('blob:')) ? val : null;
        if (typeof val === 'object' && val.url) return val.url;
        return null;
    };

    const renderMerchantDocuments = (merchant: Merchant) => {
        const docs = merchant.documents || {};
        const items: { key: string; label: string; url: string }[] = [];

        // Check direct columns
        if (merchant.business_permit_url) {
            items.push({ key: 'business_permit', label: 'Single Business Permit', url: merchant.business_permit_url });
        }
        if (merchant.kra_pin_url) {
            items.push({ key: 'kra_pin', label: 'KRA PIN Certificate', url: merchant.kra_pin_url });
        }
        if (merchant.health_permit_url) {
            items.push({ key: 'health_permit', label: 'Health & Hygiene Permit', url: merchant.health_permit_url });
        }

        // Check JSONB documents
        Object.entries(docs).forEach(([k, v]) => {
            const url = extractDocUrl(v);
            if (!url) return;
            const keyLower = k.toLowerCase();
            // Don't duplicate if already added
            if (items.some(i => i.url === url)) return;

            let label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (keyLower.includes('kra')) label = 'KRA PIN Certificate';
            else if (keyLower.includes('business') || keyLower.includes('permit')) label = 'Single Business Permit';
            else if (keyLower.includes('health')) label = 'Health & Hygiene Permit';

            items.push({ key: k, label, url });
        });
        
        if (items.length === 0) {
            return (
                <div className="flex items-center gap-2 text-amber-600 text-sm min-h-[44px]">
                    <AlertTriangle size={16} />
                    <span>No documents uploaded</span>
                </div>
            );
        }

        return (
            <div className="flex flex-wrap gap-2 mt-3">
                {items.map((item) => (
                    <a
                        key={item.key}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all min-h-[40px]"
                    >
                        <FileText size={14} />
                        <span>{item.label}</span>
                        <ExternalLink size={12} />
                    </a>
                ))}
            </div>
        );
    };

    const renderRiderDocuments = (rider: Rider) => {
        const docs = rider.documents || {};
        const items: { key: string; label: string; url: string }[] = [];

        // Check direct columns
        if (rider.id_doc_url) {
            items.push({ key: 'id_doc', label: 'National ID Card', url: rider.id_doc_url });
        }
        if (rider.license_url) {
            items.push({ key: 'license', label: "Driver's License", url: rider.license_url });
        }
        if (rider.logbook_url) {
            items.push({ key: 'logbook', label: 'Vehicle Logbook', url: rider.logbook_url });
        }
        if (rider.insurance_url) {
            items.push({ key: 'insurance', label: 'Insurance Certificate', url: rider.insurance_url });
        }

        // Check JSONB documents
        Object.entries(docs).forEach(([k, v]) => {
            const url = extractDocUrl(v);
            if (!url) return;
            if (items.some(i => i.url === url)) return;

            const keyLower = k.toLowerCase();
            let label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (keyLower.includes('id')) label = 'National ID Card';
            else if (keyLower.includes('license')) label = "Driver's License";
            else if (keyLower.includes('logbook')) label = 'Vehicle Logbook';
            else if (keyLower.includes('conduct')) label = 'Good Conduct Certificate';
            else if (keyLower.includes('insurance')) label = 'Insurance Certificate';

            items.push({ key: k, label, url });
        });

        if (items.length === 0) {
            return (
                <div className="flex items-center gap-2 text-amber-600 text-sm min-h-[44px]">
                    <AlertTriangle size={16} />
                    <span>No documents uploaded</span>
                </div>
            );
        }

        return (
            <div className="flex flex-wrap gap-2 mt-3">
                {items.map((item) => (
                    <a
                        key={item.key}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all min-h-[40px]"
                    >
                        <FileText size={14} />
                        <span>{item.label}</span>
                        <ExternalLink size={12} />
                    </a>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-12">
            <div>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
                        <p className="text-sm text-gray-400 font-medium">Review and manage merchant and rider applications</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-6 flex items-center p-1 bg-gray-100 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('merchants')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                            activeTab === 'merchants'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-gray-400 hover:text-black'
                        }`}
                    >
                        <Store size={14} />
                        Merchants
                    </button>
                    <button
                        onClick={() => setActiveTab('riders')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                            activeTab === 'riders'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-gray-400 hover:text-black'
                        }`}
                    >
                        <Bike size={14} />
                        Riders
                    </button>
                </div>

                {/* Filters */}
                <div className="mt-4 flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative w-full md:flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-gray-300 transition-all"
                        />
                    </div>
                    <div className="flex items-center p-1 bg-gray-100 rounded-xl overflow-x-auto">
                        {(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ALL'] as Status[]).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    statusFilter === status
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-400 hover:text-black'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        <AnimatePresence mode="popLayout">
                            {activeTab === 'merchants' && merchants.map((merchant) => (
                                <motion.div
                                    key={merchant.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                                >
                                    <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                                                {merchant.logo_url ? (
                                                    <img src={merchant.logo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Store size={20} className="text-gray-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-base truncate">{merchant.business_name}</h3>
                                                <p className="text-sm text-gray-500">{merchant.type}</p>
                                                {merchant.description && (
                                                    <p className="text-xs text-gray-400 mt-1 max-w-md truncate">{merchant.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(merchant.status) === 'bg-green-100 text-green-700' ? 'bg-green-50 text-green-700 border-green-100' : getStatusColor(merchant.status) === 'bg-red-100 text-red-700' ? 'bg-red-50 text-red-700 border-red-100' : getStatusColor(merchant.status) === 'bg-amber-100 text-amber-700' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                                {merchant.status}
                                            </span>

                                            {merchant.status === 'PENDING' && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleApprove(merchant.id)}
                                                        disabled={processing === merchant.id}
                                                        className="p-2 bg-white border border-gray-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                                                        aria-label="Approve merchant"
                                                        title="Approve Merchant"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(merchant.id)}
                                                        disabled={processing === merchant.id}
                                                        className="p-2 bg-white border border-gray-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                                        aria-label="Reject merchant"
                                                        title="Reject Merchant"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            )}
                                            {merchant.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleSuspend(merchant.id)}
                                                    disabled={processing === merchant.id}
                                                    className="p-2 bg-white border border-gray-200 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                                                    aria-label="Suspend merchant"
                                                    title="Suspend Store"
                                                >
                                                    <Pause size={18} />
                                                </button>
                                            )}
                                            {merchant.status === 'SUSPENDED' && (
                                                <button
                                                    onClick={() => handleUnsuspend(merchant.id)}
                                                    disabled={processing === merchant.id}
                                                    className="p-2 bg-white border border-gray-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                                                    aria-label="Unsuspend merchant"
                                                    title="Unsuspend Store"
                                                >
                                                    <CheckCircle2 size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(merchant.id, 'merchant')}
                                                disabled={processing === merchant.id}
                                                className="p-2 bg-white border border-gray-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                                aria-label="Delete merchant"
                                                title="Delete Permanently"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Documents Section */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => setExpandedMerchant(expandedMerchant === merchant.id ? null : merchant.id)}
                                            className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-all min-h-[44px]"
                                        >
                                            <FileText size={16} />
                                            <span>Documents & Details</span>
                                            <span className="text-xs text-gray-400">
                                                ({expandedMerchant === merchant.id ? 'Hide' : 'Show'})
                                            </span>
                                        </button>

                                        {expandedMerchant === merchant.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-3 p-4 bg-gray-50 rounded-xl"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Business & Contact Info</p>
                                                         <div className="space-y-1.5 text-sm">
                                                            <p><span className="text-gray-500 font-medium">Owner / Rep:</span> {merchant.owner_name || merchant.profile?.full_name || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">Phone:</span> {merchant.phone || merchant.profile?.phone || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">Email:</span> {merchant.email || merchant.profile?.email || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">Address:</span> {merchant.address || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">KRA PIN:</span> {merchant.kra_pin || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">Business Permit No:</span> {merchant.health_permit || (merchant as any).business_permit || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">M-Pesa Till:</span> {merchant.mpesa_till || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">Operating Hours:</span> {typeof (merchant as any).operating_hours === 'object' && (merchant as any).operating_hours?.hours ? (merchant as any).operating_hours.hours : (typeof (merchant as any).operating_hours === 'string' ? (merchant as any).operating_hours : '08:00 AM - 10:00 PM')}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Submitted Documents</p>
                                                        {renderMerchantDocuments(merchant)}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {activeTab === 'riders' && riders.map((rider) => (
                                <motion.div
                                    key={rider.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="w-5 h-5 sm:w-6 sm:h-6">
                                                        <Bike size={24} className="w-full h-full text-gray-400" />
                                                    </span>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-base sm:text-lg truncate">{rider.vehicle_type} Rider</h3>
                                                <p className="text-xs sm:text-sm text-gray-500">
                                                    {rider.is_online ? 'Online' : 'Offline'} • {rider.status}
                                                </p>
                                                {rider.vehicle_plate && (
                                                    <p className="text-xs text-gray-400 mt-1">Plate: {rider.vehicle_plate}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                            <span className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[9px] sm:text-xs font-black uppercase tracking-widest ${getStatusColor(rider.status)}`}>
                                                {rider.status}
                                            </span>

                                            {rider.status === 'PENDING' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(rider.id)}
                                                        disabled={processing === rider.id}
                                                        className="p-2.5 sm:p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                        aria-label="Approve rider"
                                                    >
                                                        <CheckCircle2 size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(rider.id)}
                                                        disabled={processing === rider.id}
                                                        className="p-2.5 sm:p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                        aria-label="Reject rider"
                                                    >
                                                        <XCircle size={20} />
                                                    </button>
                                                </div>
                                            )}
                                            {rider.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleSuspend(rider.id)}
                                                    disabled={processing === rider.id}
                                                    className="p-2.5 sm:p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                    aria-label="Suspend rider"
                                                    title="Suspend Rider"
                                                >
                                                    <Pause size={20} />
                                                </button>
                                            )}
                                            {rider.status === 'SUSPENDED' && (
                                                <button
                                                    onClick={() => handleUnsuspend(rider.id)}
                                                    disabled={processing === rider.id}
                                                    className="p-2.5 sm:p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                    aria-label="Unsuspend rider"
                                                    title="Unsuspend Rider"
                                                >
                                                    <CheckCircle2 size={20} />
                                                </button>
                                            )}
                                            {/* Delete — always visible */}
                                            <button
                                                onClick={() => handleDelete(rider.id, 'rider')}
                                                disabled={processing === rider.id}
                                                className="p-2.5 sm:p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                aria-label="Delete rider"
                                                title="Delete Permanently"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Documents Section */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => setExpandedRider(expandedRider === rider.id ? null : rider.id)}
                                            className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-all min-h-[44px]"
                                        >
                                            <FileText size={16} />
                                            <span>Documents & Equipment</span>
                                            <span className="text-xs text-gray-400">
                                                ({expandedRider === rider.id ? 'Hide' : 'Show'})
                                            </span>
                                        </button>

                                        {expandedRider === rider.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-3 p-4 bg-gray-50 rounded-xl"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Courier Information</p>
                                                        <div className="space-y-1.5 text-sm">
                                                            <p><span className="text-gray-500 font-medium">Full Name:</span> {rider.name || rider.profile?.full_name || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">Phone:</span> {rider.phone || rider.profile?.phone || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">Email:</span> {rider.email || rider.profile?.email || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">National ID:</span> {rider.national_id || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">M-Pesa Payout:</span> {rider.mpesa_phone || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 font-medium">Vehicle / Plate:</span> {rider.vehicle_type} {rider.vehicle_plate ? `(${rider.vehicle_plate})` : ''}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Verified Documents & Equipment</p>
                                                        {renderRiderDocuments(rider)}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

{(activeTab === 'merchants' && merchants.length === 0) && (
                            <div className="text-center py-12 sm:py-20">
                                <div className="flex justify-center mb-4">
                                    <span className="w-10 h-10 sm:w-12 sm:h-12">
                                        <Store size={48} className="w-full h-full text-gray-300" />
                                    </span>
                                </div>
                                <p className="text-gray-500 font-medium text-sm sm:text-base">No merchants found</p>
                            </div>
                        )}

                        {(activeTab === 'riders' && riders.length === 0) && (
                            <div className="text-center py-12 sm:py-20">
                                <div className="flex justify-center mb-4">
                                    <span className="w-10 h-10 sm:w-12 sm:h-12">
                                        <Bike size={48} className="w-full h-full text-gray-300" />
                                    </span>
                                </div>
                                <p className="text-gray-500 font-medium text-sm sm:text-base">No riders found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
