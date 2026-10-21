import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    User,
    ShoppingBag,
    History,
    Star,
    TrendingUp,
    Phone,
    MapPin,
    ArrowRight,
    X,
    Filter,
    ChevronRight,
    Mail,
    CreditCard,
    MessageSquare,
    Package
} from 'lucide-react';
import { adminSupabase } from '../../lib/adminSupabase';

interface CustomerSummary {
    id: string;
    name: string;
    phone: string;
    orderCount: number;
    totalSpent: number;
    lastOrder?: any;
    status: 'ACTIVE' | 'FREQUENT' | 'NEW' | 'INACTIVE';
}

export default function Customers() {
    const [orders, setOrders] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ordersRes, profilesRes] = await Promise.all([
                    adminSupabase
                        .from('orders')
                        .select('*, customer:profiles!customer_id(full_name, phone)')
                        .order('created_at', { ascending: false }),
                    adminSupabase
                        .from('profiles')
                        .select('id, full_name, phone, email, account_status, created_at')
                        .or("roles.cs.{customer},account_status.eq.active")
                        .order('created_at', { ascending: false })
                ]);

                if (ordersRes.data) setOrders(ordersRes.data);
                if (profilesRes.data) setProfiles(profilesRes.data);
            } catch (err) {
                console.error("Customers error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        const channel = adminSupabase.channel('admin_customers_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchData();
            })
            .subscribe();

        return () => { adminSupabase.removeChannel(channel); }
    }, []);

    // Derive customers from profiles + orders (merged)
    const customerDirectory = useMemo(() => {
        const directory: Record<string, CustomerSummary> = {};

        // 1. Seed directory from all registered customer profiles
        profiles.forEach(p => {
            const key = p.id;
            if (!directory[key]) {
                directory[key] = {
                    id: key,
                    name: p.full_name || p.email?.split('@')[0] || 'Customer',
                    phone: p.phone || 'N/A',
                    orderCount: 0,
                    totalSpent: 0,
                    lastOrder: undefined,
                    status: 'NEW'
                };
            }
        });

        // 2. Enrich with order data
        orders.forEach(order => {
            // Try to find profile by customer_id
            const profileKey = order.customer_id || '';
            const phone = order.customer?.phone || 'Unknown';
            const name = order.customer?.full_name || 'Walk-in Customer';

            // Use profile id as key if found, else phone
            const key = profileKey && directory[profileKey] ? profileKey : phone;

            if (!directory[key]) {
                directory[key] = {
                    id: key,
                    name,
                    phone,
                    orderCount: 0,
                    totalSpent: 0,
                    lastOrder: order,
                    status: 'NEW'
                };
            }

            directory[key].orderCount += 1;
            directory[key].totalSpent += order.total || 0;

            // Enrich name/phone from order if profile had defaults
            if (name !== 'Walk-in Customer' && directory[key].name === 'Customer') directory[key].name = name;
            if (phone !== 'Unknown' && directory[key].phone === 'N/A') directory[key].phone = phone;

            // Track most recent order
            if (!directory[key].lastOrder || new Date(order.created_at || 0) > new Date(directory[key].lastOrder?.created_at || 0)) {
                directory[key].lastOrder = order;
            }
        });

        // 3. Assign statuses
        Object.values(directory).forEach(customer => {
            if (customer.orderCount >= 10) customer.status = 'FREQUENT';
            else if (customer.orderCount >= 3) customer.status = 'ACTIVE';
            else customer.status = 'NEW';
        });

        return Object.values(directory).sort((a, b) => b.orderCount - a.orderCount);
    }, [orders, profiles]);


    const filteredCustomers = customerDirectory.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );

    const stats = {
        total: customerDirectory.length,
        avgOrderValue: customerDirectory.reduce((acc, c) => acc + (c.totalSpent / c.orderCount), 0) / customerDirectory.length,
        frequent: customerDirectory.filter(c => c.status === 'FREQUENT').length,
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
                    <p className="text-sm text-gray-400 font-medium">Customer directory & activity</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
                        <TrendingUp size={16} /> Analytics
                    </button>
                    <button className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2">
                        <Mail size={16} /> Message All
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Customers</p>
                        <p className="text-xl font-bold text-black tracking-tight">{stats.total}</p>
                    </div>
                    <div className="p-2 rounded-lg border bg-gray-50 border-gray-100">
                        <User size={18} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Avg Order Value</p>
                        <p className="text-xl font-bold text-black tracking-tight">KES {Math.round(stats.avgOrderValue || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-lg border bg-blue-50 border-blue-100 text-blue-600">
                        <ShoppingBag size={18} />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Frequent (10+)</p>
                        <p className="text-xl font-bold text-black tracking-tight">{stats.frequent}</p>
                    </div>
                    <div className="p-2 rounded-lg border bg-amber-50 border-amber-100 text-amber-600">
                        <Star size={18} />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input
                            type="text"
                            placeholder="Find customer by name or phone..."
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
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Orders</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Tier</th>
                                <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Lifetime Value</th>
                                <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Last Order</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    onClick={() => setSelectedCustomer(customer)}
                                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center font-medium">
                                                {customer.name.slice(0, 1)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{customer.name}</p>
                                                <p className="text-xs text-gray-400">{customer.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm">{customer.orderCount}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={customer.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-sm font-medium">KES {customer.totalSpent.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-sm text-gray-600">
                                            {customer.lastOrder?.created_at ? new Date(customer.lastOrder.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Customer Details Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
                    <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center font-medium">
                                    {selectedCustomer.name.slice(0, 1)}
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">{selectedCustomer.name}</h2>
                                    <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            <div className="flex items-center gap-2">
                                <StatusBadge status={selectedCustomer.status} />
                                <span className="text-sm text-gray-600">{selectedCustomer.orderCount} orders • KES {selectedCustomer.totalSpent.toLocaleString()}</span>
                            </div>

                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Order History</h3>
                                <div className="space-y-2">
                                    {orders.filter(o => (o.customer?.phone || 'Unknown') === selectedCustomer.phone).map(order => (
                                        <div key={order.id} className="p-3 border border-gray-100 rounded-lg flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-50 rounded-lg">
                                                    <Package size={16} className="text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                                                    <p className="text-xs text-gray-400">{order.status} • {order.merchant_id}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm">KES {order.total?.toLocaleString()}</p>
                                                <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {orders.filter(o => (o.customer?.phone || 'Unknown') === selectedCustomer.phone).length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-6">No orders found</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 flex gap-2">
                            <button className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">Message</button>
                            <button className="flex-1 px-3 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors">Issue Promo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: any }) {
    const configs: any = {
        'FREQUENT': 'bg-black text-white border-black',
        'ACTIVE': 'bg-green-50 text-green-700 border-green-100',
        'NEW': 'bg-blue-50 text-blue-700 border-blue-100',
        'INACTIVE': 'bg-gray-50 text-gray-600 border-gray-200'
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${configs[status]}`}>
            {status}
        </span>
    );
}

function ActionCard({ icon: Icon, label, sub }: any) {
    return (
        <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 hover:border-black transition-all cursor-pointer flex flex-col gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                <Icon size={24} className="text-black" />
            </div>
            <div>
                <p className="font-black text-lg tracking-tight">{label}</p>
                <p className="text-xs font-medium text-gray-400">{sub}</p>
            </div>
        </div>
    );
}
