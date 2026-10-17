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
                    <h1 className="text-3xl font-black tracking-tight text-black flex items-center gap-3">
                        System Control <span className="text-xs bg-black text-white px-2 py-1 rounded-full">v1.0.4</span>
                    </h1>
                    <p className="text-sm text-gray-400 font-medium">Core protocol management & global overrides</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 bg-white border border-gray-100 shadow-sm rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                        <RefreshCcw size={18} /> Sync Registry
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 shadow-lg shadow-black/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saveSuccess ? <><CheckCircle size={18} /> Saved!</> : isSaving ? 'Saving...' : <><Save size={18} /> Push Changes</>}
                    </button>
                </div>
            </div>

            {/* Quick Overrides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <OverrideCard
                    label="Core Availability"
                    desc="Master switch for the entire Muncheez network"
                    active={isSiteLive}
                    onToggle={() => setIsSiteLive(!isSiteLive)}
                    icon={Power}
                />
                <OverrideCard
                    label="Merchant Intake"
                    desc="Enable/Disable new partner registration"
                    active={merchantSignups}
                    onToggle={() => setMerchantSignups(!merchantSignups)}
                    icon={Users}
                />
                <OverrideCard
                    label="Maintenance Mode"
                    desc="Display maintenance screen to all users"
                    active={maintenanceMode}
                    onToggle={() => setMaintenanceMode(!maintenanceMode)}
                    icon={Server}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-1 space-y-2">
                    <SettingsTab label="General Environment" active={true} icon={Globe} />
                    <SettingsTab label="Security & Access" icon={Shield} />
                    <SettingsTab label="Financial Rules" icon={Scale} />
                    <SettingsTab label="Push & Webhooks" icon={Bell} />
                    <SettingsTab label="Data Management" icon={Database} />
                    <SettingsTab label="API & Integrations" icon={Smartphone} />
                </div>

                {/* Form Area */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                        <h3 className="text-xl font-black tracking-tight italic uppercase">General Environment</h3>
                        <p className="text-sm text-gray-400 font-medium mt-1">Configure global operational parameters</p>
                    </div>

                    <div className="p-8 space-y-8">
                        <section className="space-y-5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Operational Constants</h4>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Default Delivery Fee (KES)</label>
                                    <input
                                        type="number"
                                        value={deliveryFee}
                                        onChange={e => setDeliveryFee(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-black/10 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Platform Commission (%)</label>
                                    <input
                                        type="number"
                                        value={commissionRate}
                                        onChange={e => setCommissionRate(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-black/10 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Regional Branding</h4>
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group cursor-pointer hover:bg-black hover:text-white transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-black text-sm group-hover:bg-white/10 group-hover:text-white transition-colors">
                                        KE
                                    </div>
                                    <div>
                                        <p className="font-black">Nairobi, Kenya</p>
                                        <p className="text-xs opacity-50 font-medium">Primary Operational Zone</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 group-hover:text-white transition-colors" />
                            </div>
                        </section>

                        <div className="p-8 bg-[#D4AF37] rounded-3xl text-black space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-black/5 rounded-full blur-3xl -mr-24 -mt-24" />
                            <div className="relative z-10">
                                <h4 className="text-lg font-black italic uppercase">Superuser Access</h4>
                                <p className="text-sm font-bold opacity-60 mt-1">You are Currently Authenticated as Root Admin</p>
                                <button className="mt-6 px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg flex items-center gap-3">
                                    Manage Admin Team <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OverrideCard({ label, desc, active, onToggle, icon: Icon }: any) {
    return (
        <div className={`p-6 rounded-3xl border transition-all ${active ? 'bg-white border-black/5 shadow-xl' : 'bg-gray-50 border-transparent opacity-60'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className={`p-3.5 rounded-2xl ${active ? 'bg-black text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
                    <Icon size={22} />
                </div>
                <button
                    onClick={onToggle}
                    className={`w-13 h-7 rounded-full relative transition-colors duration-500 ${active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    style={{ width: 52, height: 28 }}
                >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-500 ${active ? 'left-[28px]' : 'left-1'}`} />
                </button>
            </div>
            <h3 className="text-lg font-black tracking-tight italic uppercase mb-1">{label}</h3>
            <p className="text-xs font-medium text-gray-400 leading-relaxed">{desc}</p>
        </div>
    );
}

function SettingsTab({ label, active = false, icon: Icon }: any) {
    return (
        <div className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${active ? 'bg-black text-white border-black shadow-xl' : 'bg-white border-gray-50 text-gray-400 hover:border-gray-200'}`}>
            <div className="flex items-center gap-3">
                <Icon size={18} className={active ? 'text-[#D4AF37]' : 'group-hover:text-black transition-colors'} />
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            {active && <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />}
        </div>
    );
}
