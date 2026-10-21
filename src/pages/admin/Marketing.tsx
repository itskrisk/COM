import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift,
    Zap,
    Users,
    TrendingUp,
    Plus,
    Search,
    Clock,
    X,
    ChevronRight,
    Tag,
    Target,
    BarChart3,
    ArrowRight,
    Copy,
    Check
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function Marketing() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);

    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [promos, setPromos] = useState<any[]>([]);

    useEffect(() => {
        const fetchMarketingData = async () => {
            const [{ data: campaignData }, { data: promoData }] = await Promise.all([
                supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
                supabase.from('promo_codes').select('*, campaign:campaigns(name)').order('created_at', { ascending: false })
            ]);
            if (campaignData) setCampaigns(campaignData);
            if (promoData) setPromos(promoData);
        };
        fetchMarketingData();

        const channel = supabase.channel('admin_marketing_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, fetchMarketingData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_codes' }, fetchMarketingData)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
                    <p className="text-sm text-gray-400 font-medium">Campaigns & promotions</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
                        <BarChart3 size={16} /> Reports
                    </button>
                    <button
                        onClick={() => setIsCreatorOpen(true)}
                        className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
                    >
                        <Plus size={16} /> New Campaign
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MarketingStat label="Campaigns" value={campaigns.length.toString()} sub="Total" icon={Users} color="black" />
                <MarketingStat label="Promo Codes" value={promos.length.toString()} sub="Active" icon={Tag} color="emerald" />
                <MarketingStat label="Reach" value="0" sub="Users" icon={TrendingUp} color="orange" />
                <MarketingStat label="Conversions" value="0%" sub="Avg" icon={Gift} color="purple" />
            </div>

            {/* Active Campaigns */}
            <div className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Campaigns</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaigns.length === 0 ? (
                        <div className="col-span-full p-10 text-center border border-dashed border-gray-200 rounded-xl">
                            <p className="text-sm text-gray-400">No campaigns</p>
                        </div>
                    ) : campaigns.map((c) => (
                        <CampaignCard key={c.id} campaign={c} />
                    ))}
                </div>
            </div>

            {/* Promo Code Management */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div>
                        <h3 className="font-semibold">Promo Codes</h3>
                        <p className="text-sm text-gray-400">Manage discount codes</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-gray-200 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Code</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Discount</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Usage</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Expiry</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {promos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                                        No promo codes
                                    </td>
                                </tr>
                            ) : promos.map((p) => (
                                <tr key={p.code} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-mono font-semibold">{p.code}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{p.discount}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{p.usage}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{p.expiry}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase border ${p.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Campaign Creator Modal */}
            <AnimatePresence>
                {isCreatorOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreatorOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-[4rem] shadow-2xl z-[101] overflow-hidden flex flex-col border-t border-white/20"
                        >
                            <div className="p-12 pb-6 flex justify-between items-center border-b border-gray-50">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tighter italic uppercase">Engine Setup</h2>
                                    <p className="text-sm text-gray-400 font-medium">Configure a new growth operation</p>
                                </div>
                                <button onClick={() => setIsCreatorOpen(false)} className="p-4 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-all text-gray-400">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-12 grid grid-cols-2 gap-12">
                                <div className="space-y-10">
                                    <section className="space-y-6">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-300">1. Core Strategy</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <StrategyOption icon={Zap} label="Flash Sale" active={true} />
                                            <StrategyOption icon={Users} label="Referral" />
                                            <StrategyOption icon={Tag} label="Seasonal" />
                                            <StrategyOption icon={Target} label="Retargeting" />
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-300">2. Campaign Parameters</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Operation Name</label>
                                                <input type="text" placeholder="e.g. Easter Weekend Nairobi" className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] text-sm font-bold focus:bg-white focus:border-black/5 outline-none transition-all" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Discount Logic</label>
                                                    <select className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] text-sm font-bold outline-none">
                                                        <option>Percentage (%)</option>
                                                        <option>Flat Value (KES)</option>
                                                        <option>BOGOF</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Value</label>
                                                    <input type="number" placeholder="25" className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] text-sm font-bold outline-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-10">
                                    <section className="space-y-6">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-300">3. Target Geoframe</h3>
                                        <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex items-center justify-between border-black">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
                                                    <Check size={24} />
                                                </div>
                                                <p className="font-black text-lg">All Zones (Nairobi)</p>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-300" />
                                        </div>
                                    </section>

                                    <div className="p-10 bg-black rounded-[3rem] text-white space-y-8 relative overflow-hidden h-[300px]">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-3xl" />
                                        <h4 className="text-xl font-black italic uppercase relative z-10">Operation Preview</h4>
                                        <div className="space-y-4 relative z-10">
                                            <div className="flex justify-between border-b border-white/10 pb-4">
                                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Type</span>
                                                <span className="font-bold text-sm">FLASH_SALE</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/10 pb-4">
                                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Potential Reach</span>
                                                <span className="font-bold text-sm">~15.5K Diners</span>
                                            </div>
                                            <div className="flex justify-between pb-4">
                                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Est. Conversion</span>
                                                <span className="font-bold text-sm text-[#D4AF37]">12-14%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-12 pt-6 border-t border-gray-50 bg-gray-50 flex gap-6">
                                <button className="px-10 py-5 bg-white border border-gray-100 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-white/50 transition-all shadow-sm">
                                    Save as Draft
                                </button>
                                <button className="flex-1 py-5 bg-black text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-4">
                                    Initialize Campaign Flow <ArrowRight size={20} />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function MarketingStat({ label, value, sub, icon: Icon, color }: any) {
    const colors: any = {
        black: 'bg-black/10 text-black',
        emerald: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600'
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-xl font-bold text-black tracking-tight">{value}</p>
                {sub && <p className="text-xs text-gray-400">{sub}</p>}
            </div>
            <div className={`p-2 rounded-lg border ${colors[color]}`}>
                <Icon size={18} />
            </div>
        </div>
    );
}

function CampaignCard({ campaign }: any) {
    return (
        <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{campaign.type?.replace(/_/g, ' ')}</span>
                    <h3 className="text-base font-semibold mt-1">{campaign.name}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${campaign.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {campaign.status}
                </span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <div>
                    <p className="text-gray-500">Reach</p>
                    <p className="font-medium">{campaign.reach || '0'}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-500">Conv.</p>
                    <p className="font-medium">{campaign.conversion || '0%'}</p>
                </div>
            </div>
        </div>
    );
}

function StrategyOption({ icon: Icon, label, active = false }: any) {
    return (
        <div className={`p-6 rounded-3xl border ${active ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-400 border-transparent'} hover:border-black transition-all cursor-pointer flex flex-col items-center gap-4 group`}>
            <Icon size={24} className={active ? 'text-[#D4AF37]' : 'group-hover:text-black transition-colors'} />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
    );
}
