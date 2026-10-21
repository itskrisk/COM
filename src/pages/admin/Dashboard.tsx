import {
    TrendingUp,
    ShoppingBag,
    Bike,
    Store,
    Activity,
    Clock,
    CheckCircle,
    User,
    ArrowRight,
    Package,
    LogOut
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { adminSupabase } from '../../lib/adminSupabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ADMIN_SESSION_KEY = 'muncheez_admin_session';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [merchants, setMerchants] = useState<any[]>([]);
    const [riders, setRiders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const handleLogout = async () => {
        await signOut();
        navigate('/admin/login', { replace: true });
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [ordersData, merchantsData, ridersData] = await Promise.all([
                    adminSupabase.from('orders').select('*, customer:profiles!customer_id(full_name, phone)').order('created_at', { ascending: false }).limit(50),
                    adminSupabase.from('merchants').select('id, business_name, type, status, logo_url').order('created_at', { ascending: false }),
                    adminSupabase.from('riders').select('id, name, is_online, status, rating, total_deliveries, performance, earnings, wallet').order('created_at', { ascending: false })
                ]);

                if (ordersData.data) setOrders(ordersData.data);

                // Map merchants
                if (merchantsData.data) {
                    setMerchants(merchantsData.data.map(m => ({
                        id: m.id,
                        businessName: m.business_name || 'Unnamed',
                        type: m.type || 'Restaurant',
                        status: m.status || 'PENDING',
                        logoUrl: m.logo_url
                    })));
                }

                if (ridersData.data) setRiders(ridersData.data);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Stats
    const totalRevenue = orders.reduce((acc, order) => acc + (order.total || 0), 0);
    const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
    const onlineRiders = riders.filter(r => r.is_online);
    const busyRiders = riders.filter(r => r.status === 'ACTIVE' || r.status === 'BUSY');
    const pendingMerchants = merchants.filter(m => m.status === 'PENDING');

    // Sector breakdown
    const sectorStats = {
        Restaurant: merchants.filter(m => m.type === 'Restaurant').length,
        Supermarket: merchants.filter(m => m.type === 'Supermarket').length,
        Pharmacy: merchants.filter(m => m.type === 'Pharmacy').length,
        Water: merchants.filter(m => m.type === 'Water').length,
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
                    <p className="text-sm text-gray-400 font-medium">Operations dashboard</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm w-fit"
                >
                    <LogOut size={16} /> Sign out
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-500">Gross Revenue</p>
                            <p className="text-2xl font-bold mt-1">KES {(totalRevenue / 1000).toFixed(1)}K</p>
                        </div>
                        <TrendingUp size={20} className="text-gray-400" />
                    </div>
                    <div className="h-24 flex items-end gap-1 mt-6">
                        {[20, 35, 25, 50, 40, 65, 55].map((h, i) => (
                            <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                </div>

                <div className="md:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-500">Active Orders</p>
                        <ShoppingBag size={18} className="text-gray-400" />
                    </div>
                    <p className="text-3xl font-bold">{activeOrders.length}</p>
                    <p className="text-xs text-gray-400 mt-2">In progress</p>
                </div>

                <div className="md:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-500">Online Riders</p>
                        <Bike size={18} className="text-gray-400" />
                    </div>
                    <p className="text-3xl font-bold">{onlineRiders.length}</p>
                    <p className="text-xs text-gray-400 mt-2">{busyRiders.length} busy</p>
                </div>

                <div className="md:col-span-4 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-semibold mb-4">Recent Orders</h3>
                    <div className="space-y-3">
                        {orders.slice(0, 5).map((order) => (
                            <div key={order.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                                        <Package size={14} className="text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                                        <p className="text-xs text-gray-400">{order.customer?.full_name || 'Walk-in'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm">KES {order.total?.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400">{order.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-4 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-semibold mb-4">Merchants</h3>
                    <div className="space-y-3">
                        {merchants.slice(0, 5).map((m) => (
                            <div key={m.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-50 rounded-lg overflow-hidden">
                                        {m.logoUrl ? <img src={m.logoUrl} className="w-full h-full object-cover" /> : <Store size={14} className="m-auto mt-2 text-gray-400" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{m.businessName}</p>
                                        <p className="text-xs text-gray-400">{m.type}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {m.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-4 bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 text-white">
                    <h3 className="font-semibold mb-4">Fleet Overview</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-2xl font-bold">{onlineRiders.length}</p>
                            <p className="text-xs text-gray-400 mt-1">Online</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{busyRiders.length}</p>
                            <p className="text-xs text-gray-400 mt-1">Busy</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{merchants.length}</p>
                            <p className="text-xs text-gray-400 mt-1">Merchants</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ops Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sector Status */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg tracking-tight">Sector Health</h3>
                            <p className="text-xs text-gray-400 font-medium">Distribution of approved partners</p>
                        </div>
                        <Activity className="text-gray-400" size={20} />
                    </div>
                    <div className="p-6 space-y-4">
                        {Object.entries(sectorStats).map(([sector, count]) => (
                            <div key={sector}>
                                <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wider">
                                    <span className="text-gray-600">{sector}</span>
                                    <span className="text-black">{count}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-black rounded-full transition-all duration-1000"
                                        style={{ width: `${merchants.length ? (count / merchants.length) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 pt-0 flex items-center justify-between">
                        <div className="flex -space-x-2">
                            {merchants.slice(0, 3).map((m, i) => (
                                <img key={i} src={m.logoUrl} className="w-8 h-8 rounded-full border-2 border-white object-cover" alt="" />
                            ))}
                            {merchants.length > 3 && (
                                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                                    +{merchants.length - 3}
                                </div>
                            )}
                        </div>
                        <button className="text-xs font-bold text-gray-600 hover:text-black flex items-center gap-1.5 transition-colors">
                            Partner Insights <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Logistics Hub */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-lg tracking-tight">Logistics Snapshot</h3>
                            <p className="text-xs text-gray-400 font-medium">Real-time rider geofencing & dispatch status</p>
                        </div>
                        <div className="px-3 py-1.5 border border-gray-200 rounded-lg">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Zone: Nairobi Core</span>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-4 border border-gray-100 rounded-lg">
                                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">On-Duty Riders</div>
                                <div className="text-3xl font-bold tracking-tight">{onlineRiders.length}</div>
                            </div>
                            <div className="p-4 border border-gray-100 rounded-lg">
                                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Active Deliveries</div>
                                <div className="text-3xl font-bold tracking-tight">{activeOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length}</div>
                            </div>
                            <div className="p-4 border border-gray-100 rounded-lg">
                                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Avg Dispatch</div>
                                <div className="text-3xl font-bold tracking-tight">4.2<span className="text-sm font-medium text-gray-400 ml-1">min</span></div>
                            </div>
                            <div className="p-4 border border-gray-100 rounded-lg">
                                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Success Rate</div>
                                <div className="text-3xl font-bold tracking-tight">98.2<span className="text-sm font-medium text-gray-400 ml-1">%</span></div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2">
                                <Activity size={16} /> Manage Fleet
                            </button>
                            <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">
                                Heatmap
                            </button>
                        </div>
                    </div>
                </div>

                {/* Operations Feed */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg tracking-tight">Live Operations Feed</h3>
                            <p className="text-xs text-gray-400 font-medium">Monitoring critical flow events</p>
                        </div>
                        <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all">
                            Filter View
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {orders.slice(0, 5).map((order) => (
                            <div key={order.id} className="p-4 md:p-6 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className={`p-3 rounded-lg ${order.status === 'DELIVERED' ? 'bg-green-50 text-green-600' :
                                            order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                                                'bg-blue-50 text-blue-600'
                                        }`}>
                                        <Package size={18} />
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-bold text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
                                            <StatusBadge status={order.status} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-medium">
                                            <span className="flex items-center gap-1"><User size={12} /> {order.customer?.full_name || 'Walk-in'}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>•</span>
                                            <span className="text-black font-bold">KES {order.total?.toLocaleString() || '0'}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-black transition-colors shadow-sm">
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-gray-50/40 border-t border-gray-100">
                        <button className="w-full py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-gray-300 hover:text-black transition-all">
                            View All Historical Data
                        </button>
                    </div>
                </div>

                {/* Approvals Standby */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-fit">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg tracking-tight">Onboarding Standby</h3>
                            <p className="text-xs text-gray-400 font-medium">Partners awaiting verification</p>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                            <Clock size={16} />
                        </div>
                    </div>

                    <div className="p-6">
                        {pendingMerchants.length === 0 ? (
                            <div className="py-10 text-center">
                                <CheckCircle size={40} className="mx-auto text-green-500/20 mb-3" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Queue Clear</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingMerchants.map((merchant) => (
                                    <div key={merchant.id} className="p-3 bg-gray-50/50 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-gray-100 overflow-hidden shadow-sm">
                                                <img src={merchant.logoUrl} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-black">{merchant.businessName}</div>
                                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{merchant.type}</div>
                                            </div>
                                        </div>
                                        <button className="p-2 bg-white text-gray-400 hover:text-black rounded-lg border border-gray-200 transition-colors">
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button className="w-full py-2.5 mt-2 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors">
                                    Review Queue
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subValue, trend, isPositive, icon: Icon, color }: any) {
    const colorStyles: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        orange: 'text-orange-600 bg-orange-50 border-orange-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all relative">
            <div className={`absolute top-5 right-5 p-2 rounded-lg ${colorStyles[color]} border`}>
                <Icon size={18} />
            </div>

            <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">{title}</p>
                <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-black tracking-tight">{value}</h3>
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${isPositive ? 'text-green-700 bg-green-50 border border-green-100' : 'text-red-600 bg-red-50 border border-red-100'}`}>
                        {trend}
                    </div>
                </div>
                {subValue && (
                    <div className="text-xs text-gray-500 font-medium">{subValue}</div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        'CREATED': 'bg-gray-50 text-gray-600 border-gray-200',
        'PAYMENT_CONFIRMED': 'bg-blue-50 text-blue-700 border-blue-100',
        'PREPARING': 'bg-orange-50 text-orange-700 border-orange-100',
        'READY_FOR_PICKUP': 'bg-purple-50 text-purple-700 border-purple-100',
        'OUT_FOR_DELIVERY': 'bg-amber-50 text-amber-700 border-amber-100',
        'DELIVERED': 'bg-green-50 text-green-700 border-green-100',
        'CANCELLED': 'bg-red-50 text-red-700 border-red-100',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${styles[status] || styles['CREATED']}`}>
            {status.replace(/_/g, ' ')}
        </span>
    );
}
