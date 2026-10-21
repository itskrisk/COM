import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LifeBuoy,
    AlertCircle,
    CheckCircle,
    Clock,
    Search,
    MessageSquare,
    X,
    ChevronRight,
    ShieldAlert,
    Inbox
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function Support() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [adminNote, setAdminNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchSupportData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*, user:profiles!user_id(full_name, phone)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setTickets(data);
        } catch (err) {
            console.error('Support fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSupportData();

        const channel = supabase.channel('admin_support_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchSupportData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const updateTicketStatus = async (ticketId: string, status: string, note?: string) => {
        setIsSaving(true);
        try {
            await supabase
                .from('support_tickets')
                .update({
                    status,
                    admin_notes: note ?? selectedTicket?.admin_notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ticketId);
            await fetchSupportData();
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket((prev: any) => prev ? { ...prev, status } : null);
            }
        } catch (err) {
            console.error('Update ticket error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredTickets = tickets.filter(t => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            (t.subject || '').toLowerCase().includes(q) ||
            (t.user?.full_name || '').toLowerCase().includes(q) ||
            (t.message || '').toLowerCase().includes(q) ||
            (t.category || '').toLowerCase().includes(q);
        const matchesTab = activeTab === 'ALL' || t.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const stats = {
        open: tickets.filter(t => t.status === 'OPEN').length,
        inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        resolved: tickets.filter(t => t.status === 'RESOLVED').length,
        urgent: tickets.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length,
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        Support
                        {stats.open > 0 && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">{stats.open}</span>}
                    </h1>
                    <p className="text-sm text-gray-400 font-medium">Customer support tickets</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
                        <ShieldAlert size={16} /> Protocols
                    </button>
                    <button className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2">
                        <MessageSquare size={16} /> New Ticket
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SupportStat label="Open" value={stats.open.toString()} sub="Action needed" icon={LifeBuoy} color="red" />
                <SupportStat label="In Progress" value={stats.inProgress.toString()} sub="Handling" icon={Clock} color="orange" />
                <SupportStat label="Urgent/High" value={stats.urgent.toString()} sub="Priority" icon={AlertCircle} color="blue" />
                <SupportStat label="Resolved" value={stats.resolved.toString()} sub="Done" icon={CheckCircle} color="emerald" />
            </div>

            {/* Ticket List */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex items-center p-1 bg-gray-100 rounded-xl flex-wrap">
                        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-black'}`}
                            >
                                {tab.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-gray-200 transition-all"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Loading...</p>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <Inbox size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-sm text-gray-500">No tickets</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredTickets.map(t => (
                            <div
                                key={t.id}
                                onClick={() => { setSelectedTicket(t); setAdminNote(t.admin_notes || ''); }}
                                className="p-4 md:p-6 flex items-center justify-between gap-4 hover:bg-gray-50/60 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.priority === 'URGENT' ? 'bg-red-50 text-red-600' : t.priority === 'HIGH' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                                        <LifeBuoy size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-medium truncate">{t.subject}</span>
                                            <span className="text-[10px] text-gray-400">#{t.id.slice(0, 6).toUpperCase()}</span>
                                        </div>
                                        <p className="text-xs text-gray-400">{t.user?.full_name || 'User'} · {new Date(t.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase border ${t.status === 'OPEN' ? 'bg-red-50 text-red-700 border-red-100' : t.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-100' : t.status === 'RESOLVED' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                        {t.status.replace('_', ' ')}
                                    </span>
                                    <ChevronRight size={16} className="text-gray-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Ticket Detail Drawer */}
            <AnimatePresence>
                {selectedTicket && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTicket(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[101] overflow-hidden flex flex-col"
                        >
                            <div className="flex-1 overflow-y-auto">
                                <div className={`p-8 border-b border-gray-50 ${selectedTicket.priority === 'URGENT' ? 'bg-red-500' :
                                    selectedTicket.priority === 'HIGH' ? 'bg-orange-500' :
                                        'bg-black'
                                    } text-white relative`}>
                                    <div className="absolute top-4 right-4">
                                        <button onClick={() => setSelectedTicket(null)} className="p-2.5 bg-black/10 hover:bg-black/20 rounded-xl transition-all">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{selectedTicket.category || 'GENERAL'}</span>
                                        <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-black">#{selectedTicket.id.slice(0, 8).toUpperCase()}</span>
                                        <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-black">{selectedTicket.priority || 'MEDIUM'}</span>
                                    </div>
                                    <h2 className="text-xl font-black tracking-tight mb-1">{selectedTicket.subject}</h2>
                                    <p className="text-sm font-bold opacity-70">{selectedTicket.user?.full_name || 'Anonymous'} · {selectedTicket.user?.phone || 'N/A'}</p>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2">Message</p>
                                        <p className="text-sm text-gray-600 leading-relaxed font-medium italic">"{selectedTicket.message}"</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-1">Status</p>
                                            <p className={`text-sm font-black uppercase ${selectedTicket.status === 'OPEN' ? 'text-red-500' :
                                                selectedTicket.status === 'IN_PROGRESS' ? 'text-orange-500' :
                                                    selectedTicket.status === 'RESOLVED' ? 'text-emerald-600' : 'text-gray-400'
                                                }`}>{selectedTicket.status.replace('_', ' ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-1">Submitted</p>
                                            <p className="text-sm font-black text-black">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {selectedTicket.admin_notes && (
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2">Previous Notes</p>
                                            <p className="text-sm text-gray-500 font-medium">{selectedTicket.admin_notes}</p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2">Admin Notes</p>
                                        <textarea
                                            value={adminNote}
                                            onChange={e => setAdminNote(e.target.value)}
                                            placeholder="Add internal notes..."
                                            rows={4}
                                            className="w-full border-b-2 border-gray-200 focus:border-black outline-none text-sm font-medium text-gray-700 resize-none py-2 bg-transparent transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3">
                                <button
                                    onClick={() => updateTicketStatus(selectedTicket.id, 'IN_PROGRESS', adminNote)}
                                    disabled={isSaving || selectedTicket.status === 'IN_PROGRESS'}
                                    className="flex-1 py-3.5 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-40 transition-all"
                                >
                                    In Progress
                                </button>
                                <button
                                    onClick={() => updateTicketStatus(selectedTicket.id, 'RESOLVED', adminNote)}
                                    disabled={isSaving || selectedTicket.status === 'RESOLVED'}
                                    className="flex-1 py-3.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-40 transition-all"
                                >
                                    {isSaving ? 'Saving...' : 'Resolve'}
                                </button>
                                <button
                                    onClick={() => updateTicketStatus(selectedTicket.id, 'CLOSED', adminNote)}
                                    disabled={isSaving}
                                    className="px-5 py-3.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 disabled:opacity-40 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function SupportStat({ label, value, sub, icon: Icon, color }: any) {
    const colors: any = {
        red: 'bg-red-50 text-red-600',
        orange: 'bg-orange-50 text-orange-600',
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600'
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
