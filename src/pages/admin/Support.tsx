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
                    <h1 className="text-3xl font-black tracking-tight text-black flex items-center gap-3">
                        Support Tickets <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">{stats.open}</span>
                    </h1>
                    <p className="text-sm text-gray-400 font-medium">Real-time resolution & customer support management</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 bg-white border border-gray-100 shadow-sm rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
                        <ShieldAlert size={18} /> Safety Protocols
                    </button>
                    <button className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 shadow-lg shadow-black/10 transition-all flex items-center gap-2">
                        <MessageSquare size={18} /> New Ticket
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SupportStat label="Open" value={stats.open.toString()} sub="Action Required" icon={LifeBuoy} color="red" />
                <SupportStat label="In Progress" value={stats.inProgress.toString()} sub="Being Handled" icon={Clock} color="orange" />
                <SupportStat label="Urgent / High" value={stats.urgent.toString()} sub="Priority Cases" icon={AlertCircle} color="blue" />
                <SupportStat label="Resolved" value={stats.resolved.toString()} sub="Completed" icon={CheckCircle} color="emerald" />
            </div>

            {/* Ticket List */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-6 border-b border-gray-50 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-gray-50/20">
                    <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex-wrap gap-1">
                        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab
                                    ? tab === 'OPEN' ? 'bg-red-500 text-white shadow-lg'
                                        : tab === 'IN_PROGRESS' ? 'bg-orange-500 text-white shadow-lg'
                                            : tab === 'RESOLVED' ? 'bg-emerald-500 text-white shadow-lg'
                                                : 'bg-black text-white shadow-lg'
                                    : 'text-gray-400 hover:text-black'}`}
                            >
                                {tab.replace('_', ' ')} {tab === 'ALL' ? `(${tickets.length})` : tab === 'OPEN' ? `(${stats.open})` : tab === 'IN_PROGRESS' ? `(${stats.inProgress})` : `(${stats.resolved})`}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-72 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-5 py-3.5 bg-white border border-transparent rounded-2xl text-sm font-medium focus:border-black/5 transition-all outline-none shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1">
                    {isLoading ? (
                        <div className="p-20 text-center opacity-20">
                            <div className="animate-spin w-10 h-10 border-4 border-black border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest">Loading tickets...</p>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="p-20 text-center opacity-20">
                            <Inbox size={60} className="mx-auto mb-6" />
                            <p className="text-xl font-black italic">No tickets found</p>
                            <p className="text-sm font-medium mt-2">Support tickets submitted via the app will appear here</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredTickets.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => { setSelectedTicket(t); setAdminNote(t.admin_notes || ''); }}
                                    className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50/50 cursor-pointer group transition-all"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.priority === 'URGENT' ? 'bg-red-50 text-red-500' :
                                            t.priority === 'HIGH' ? 'bg-orange-50 text-orange-500' :
                                                'bg-blue-50 text-blue-500'
                                            } group-hover:bg-black group-hover:text-white transition-all`}>
                                            <LifeBuoy size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">{t.category || 'GENERAL'}</span>
                                                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[8px] font-black text-gray-400">#{t.id.slice(0, 8).toUpperCase()}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${t.priority === 'URGENT' ? 'bg-red-100 text-red-600' :
                                                    t.priority === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                                                        'bg-gray-100 text-gray-400'
                                                    }`}>{t.priority || 'MEDIUM'}</span>
                                            </div>
                                            <h3 className="font-black tracking-tight truncate text-sm">{t.subject}</h3>
                                            <p className="text-xs text-gray-400 font-medium">{t.user?.full_name || 'Anonymous'} · {new Date(t.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${t.status === 'OPEN' ? 'bg-red-50 text-red-500' :
                                            t.status === 'IN_PROGRESS' ? 'bg-orange-50 text-orange-500' :
                                                t.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600' :
                                                    'bg-gray-100 text-gray-400'
                                            }`}>{t.status.replace('_', ' ')}</span>
                                        <button className="p-2.5 bg-gray-50 rounded-xl text-gray-300 group-hover:text-black group-hover:bg-white border border-transparent group-hover:border-gray-100 transition-all">
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-xl transition-all">
            <div className={`p-3.5 rounded-2xl ${colors[color]} inline-flex mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={22} />
            </div>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-black tracking-tighter italic">{value}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-60">{sub}</p>
        </div>
    );
}
