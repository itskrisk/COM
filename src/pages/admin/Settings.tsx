import { useState, useEffect } from 'react';
import {
    Shield,
    Bell,
    Globe,
    Scale,
    Users,
    Save,
    RefreshCcw,
    Power,
    Server,
    Database,
    ChevronRight,
    ArrowRight,
    Smartphone,
    CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function Settings() {
    const [isSiteLive, setIsSiteLive] = useState(true);
    const [merchantSignups, setMerchantSignups] = useState(true);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState('150');
    const [commissionRate, setCommissionRate] = useState('15');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data } = await supabase
                    .from('admin_settings')
                    .select('key, value');

                if (data) {
                    const mpesa = data.find(d => d.key === 'mpesa_config');
                    const rules = data.find(d => d.key === 'platform_rules');

                    if (mpesa?.value) {
                        setDeliveryFee(String(mpesa.value.default_delivery_fee ?? 150));
                        setCommissionRate(String(Math.round((mpesa.value.commission_rate ?? 0.15) * 100)));
                    }
                    if (rules?.value) {
                        setIsSiteLive(rules.value.is_site_live ?? true);
                        setMerchantSignups(rules.value.merchant_signups_enabled ?? true);
                        setMaintenanceMode(rules.value.maintenance_mode ?? false);
                    }
                }
            } catch (e) {
                console.error('Failed to load settings:', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await Promise.all([
                supabase.from('admin_settings')
                    .upsert({
                        key: 'platform_rules',
                        value: {
                            is_site_live: isSiteLive,
                            merchant_signups_enabled: merchantSignups,
                            courier_signups_enabled: true,
                            maintenance_mode: maintenanceMode
                        },
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'key' }),
                supabase.from('admin_settings')
                    .upsert({
                        key: 'mpesa_config',
                        value: {
                            shortcode: '174379',
                            consumer_key: 'hNY8AACKWRniHG91pB9PCP11v55i4sOdaGeIAVk8xxidr2AL',
                            environment: 'sandbox',
                            commission_rate: Number(commissionRate) / 100,
                            default_delivery_fee: Number(deliveryFee)
                        },
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'key' })
            ]);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Settings save error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-gray-400 font-medium">System configuration</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <RefreshCcw size={16} /> Reload
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saveSuccess ? <><CheckCircle size={16} /> Saved</> : isSaving ? 'Saving...' : <><Save size={16} /> Save</>}
                    </button>
                </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Power size={18} className="text-gray-600" />
                            <h3 className="font-semibold">Site Status</h3>
                        </div>
                        <button
                            onClick={() => setIsSiteLive(!isSiteLive)}
                            className={`w-11 h-6 rounded-full relative transition-colors ${isSiteLive ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isSiteLive ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">Platform availability</p>
                </div>

                <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users size={18} className="text-gray-600" />
                            <h3 className="font-semibold">Merchant Signups</h3>
                        </div>
                        <button
                            onClick={() => setMerchantSignups(!merchantSignups)}
                            className={`w-11 h-6 rounded-full relative transition-colors ${merchantSignups ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${merchantSignups ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">New partner registration</p>
                </div>

                <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Server size={18} className="text-gray-600" />
                            <h3 className="font-semibold">Maintenance</h3>
                        </div>
                        <button
                            onClick={() => setMaintenanceMode(!maintenanceMode)}
                            className={`w-11 h-6 rounded-full relative transition-colors ${maintenanceMode ? 'bg-amber-500' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${maintenanceMode ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">Maintenance mode</p>
                </div>

                <div className="md:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Scale size={18} className="text-gray-600" />
                        <h3 className="font-semibold">Financial Parameters</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm text-gray-600">Delivery Fee (KES)</label>
                            <input
                                type="number"
                                value={deliveryFee}
                                onChange={e => setDeliveryFee(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm text-gray-600">Commission (%)</label>
                            <input
                                type="number"
                                value={commissionRate}
                                onChange={e => setCommissionRate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="md:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Globe size={18} className="text-gray-600" />
                        <h3 className="font-semibold">Region</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-semibold">KE</div>
                        <div>
                            <p className="text-sm font-medium">Nairobi, Kenya</p>
                            <p className="text-xs text-gray-400">Primary operational zone</p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-6 bg-gradient-to-r from-gray-900 to-black rounded-xl p-6 text-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold">Admin Access</h3>
                            <p className="text-sm text-gray-400">Root administrator privileges</p>
                        </div>
                        <button className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
                            Manage Team <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OverrideCard({ label, desc, active, onToggle, icon: Icon }: any) {
    return (
        <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-lg border ${active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    <Icon size={18} />
                </div>
                <button
                    onClick={onToggle}
                    className={`w-11 h-6 rounded-full relative transition-colors ${active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${active ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
            </div>
            <h3 className="text-sm font-semibold mb-1">{label}</h3>
            <p className="text-xs text-gray-500">{desc}</p>
        </div>
    );
}

function SettingsTab({ label, active = false, icon: Icon }: any) {
    return (
        <div className={`p-3 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${active ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
            <div className="flex items-center gap-2">
                <Icon size={16} />
                <span className="text-sm font-medium">{label}</span>
            </div>
            {active && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
        </div>
    );
}
