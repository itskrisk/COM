import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Eye,
    Clock,
    MapPin,
    Calendar,
    Package,
    X,
    CreditCard,
    ShoppingBag
} from 'lucide-react';
import { adminSupabase } from '../../lib/adminSupabase';
import { AdminModal } from '../../components/admin/AdminModal';

export default function Orders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await adminSupabase
                    .from('orders')
                    .select('*, customer:profiles!customer_id(full_name, phone), merchant:merchants!merchant_id(business_name, address), rider:riders!rider_id(name, phone, vehicle_type)')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (data) setOrders(data);
            } catch (err) {
                console.error("Error fetching orders:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();

        const channel = adminSupabase.channel('admin_orders_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            adminSupabase.removeChannel(channel);
        };
    }, []);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await adminSupabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);
            if (error) throw error;
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } catch (err) {
            console.error("Error updating order status:", err);
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm('Cancel this order?')) return;
        try {
            const { error } = await adminSupabase
                .from('orders')
                .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', orderId);
            if (error) throw error;
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED', cancelled_at: new Date().toISOString() } : o));
        } catch (err) {
            console.error("Error cancelling order:", err);
        }
    };

    const exportOrdersCSV = () => {
        const headers = ['Order ID', 'Customer', 'Merchant', 'Status', 'Total (KES)', 'Payment Method', 'Delivery Address', 'Created At'];
        const rows = filteredOrders.map(o => [
            o.id,
            o.customer?.full_name || '',
            o.merchant?.business_name || o.merchant_id || '',
            o.status,
            o.total || 0,
            o.payment_method || '',
            o.delivery_address || '',
            o.created_at
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const filteredOrders = orders.filter(order => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            order.id.toLowerCase().includes(searchLower) ||
            (order.customer?.full_name || '').toLowerCase().includes(searchLower) ||
            (order.merchant_id || '').toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Stats
    const stats = {
        total: orders.length,
        active: orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
        revenue: orders.reduce((acc, o) => acc + (o.total || 0), 0),
        pending: orders.filter(o => o.status === 'CREATED').length
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        Orders <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">{orders.length}</span>
                    </h1>
                    <p className="text-sm text-gray-400 font-medium">Real-time order orchestration • Muncheez Operations</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportOrdersCSV}
                        className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Filter size={16} /> Export CSV ({filteredOrders.length})
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickStat label="Total Orders" value={stats.total.toString()} icon={ShoppingBag} color="blue" />
                <QuickStat label="Live Operations" value={stats.active.toString()} icon={Clock} color="orange" />
                <QuickStat label="Gross Volume" value={`KES ${(stats.revenue / 1000).toFixed(1)}K`} icon={CreditCard} color="emerald" />
                <QuickStat label="Awaiting Action" value={stats.pending.toString()} icon={Package} color="purple" />
            </div>

            {/* Filters & Workspace */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input
                            type="text"
                            placeholder="Find by ID, Client, or Store..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-gray-200 transition-all"
                        />
                    </div>
                    <div className="flex items-center p-1 bg-gray-100 rounded-xl w-full lg:w-auto overflow-x-auto">
                        {['ALL', 'CREATED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${statusFilter === status
                                    ? 'bg-white text-black shadow-sm'
                                    : 'text-gray-400 hover:text-black'
                                    }`}
                            >
                                {status.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Order</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Merchant</th>
                                <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-14 text-center text-gray-400">
                                        <div className="flex flex-col items-center">
                                            <Package size={36} className="mb-2" />
                                            <p className="text-sm">No orders found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                                                    <ShoppingBag size={16} className="text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                                                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm">{order.customer?.full_name || 'Walk-in'}</p>
                                                <p className="text-xs text-gray-400">{order.customer?.phone || ''}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {order.merchant?.business_name || order.merchant_id || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-sm font-medium">KES {order.total?.toLocaleString() || '0'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white"
                                                >
                                                    <option value="CREATED">CREATED</option>
                                                    <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
                                                    <option value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</option>
                                                    <option value="ACCEPTED">ACCEPTED</option>
                                                    <option value="PREPARING">PREPARING</option>
                                                    <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
                                                    <option value="RIDER_ASSIGNED">RIDER_ASSIGNED</option>
                                                    <option value="PICKED_UP">PICKED_UP</option>
                                                    <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                                                    <option value="DELIVERED">DELIVERED</option>
                                                    <option value="CANCELLED">CANCELLED</option>
                                                </select>
                                                {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                                                    <button
                                                        onClick={() => handleCancelOrder(order.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-gray-50/40 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Showing {filteredOrders.length} of {orders.length} events</p>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-400 cursor-not-allowed">Previous</button>
                        <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50">Next</button>
                    </div>
                </div>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedOrder(null)}
                    />
                    <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Order</span>
                                    <StatusBadge status={selectedOrder.status} />
                                </div>
                                <h2 className="text-lg font-semibold tracking-tight">#{selectedOrder.id.slice(0, 12).toUpperCase()}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Customer</label>
                                    <p className="text-sm">{selectedOrder.customer?.full_name || 'Walk-in'}</p>
                                    <p className="text-xs text-gray-500">{selectedOrder.customer?.phone || ''}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Merchant</label>
                                    <p className="text-sm">{selectedOrder.merchant?.business_name || selectedOrder.merchant_id || '—'}</p>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Delivery Address</label>
                                    <div className="flex items-start gap-2 text-sm text-gray-700">
                                        <MapPin size={16} className="shrink-0 mt-0.5 text-gray-400" />
                                        <p>{selectedOrder.delivery_address || '—'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Created</label>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <Calendar size={16} className="text-gray-400" />
                                        <p>{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="border border-gray-100 rounded-lg overflow-hidden">
                                <div className="px-4 py-2.5 bg-gray-50/50 border-b border-gray-100">
                                    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Items</h3>
                                </div>
                                <div className="p-4 space-y-3">
                                    {(selectedOrder.items || []).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-start">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center text-xs">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className="text-sm">{item.name}</p>
                                                    {item.options && (
                                                        <p className="text-xs text-gray-400 mt-0.5">{item.options.join(', ')}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm">KES {((item.price || 0) * item.quantity).toLocaleString()}</p>
                                        </div>
                                    ))}
                                    <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5">
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Subtotal</span>
                                            <span>KES {selectedOrder.total?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Delivery Fee</span>
                                            <span className="text-green-600">Free</span>
                                        </div>
                                        <div className="flex justify-between pt-1.5 border-t border-gray-100">
                                            <span className="text-sm font-medium">Total</span>
                                            <span className="text-sm font-medium">KES {selectedOrder.total?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Timeline</h3>
                                <div className="space-y-3">
                                    <TimelineStep title="Order Created" time={new Date(selectedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} isDone description="Order placed" />
                                    <TimelineStep title="Merchant Confirmed" time="--" isDone={['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(selectedOrder.status)} description="Acknowledged" />
                                    <TimelineStep title="Rider Assigned" time="--" isDone={['READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(selectedOrder.status)} description="Dispatched" />
                                    <TimelineStep title="Picked Up" time="--" isDone={['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(selectedOrder.status)} description="Collected" />
                                    <TimelineStep title="Delivered" time="--" isDone={selectedOrder.status === 'DELIVERED'} description="Completed" />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Update status</span>
                                <select
                                    value={selectedOrder.status}
                                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                                    className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                                >
                                    <option value="CREATED">CREATED</option>
                                    <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
                                    <option value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</option>
                                    <option value="ACCEPTED">ACCEPTED</option>
                                    <option value="PREPARING">PREPARING</option>
                                    <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
                                    <option value="RIDER_ASSIGNED">RIDER_ASSIGNED</option>
                                    <option value="PICKED_UP">PICKED_UP</option>
                                    <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                                    <option value="DELIVERED">DELIVERED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                </select>
                            </div>
                            {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && (
                                <button
                                    onClick={() => handleCancelOrder(selectedOrder.id)}
                                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    Cancel order
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function QuickStat({ label, value, icon: Icon, color }: any) {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        orange: 'text-orange-600 bg-orange-50 border-orange-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100'
    };

    return (
        <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-gray-200 transition-all">
            <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-xl font-bold text-black tracking-tight">{value}</p>
            </div>
            <div className={`p-2 rounded-lg border ${colors[color]}`}>
                <Icon size={18} />
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        'CREATED': 'bg-gray-50 text-gray-600 border-gray-200',
        'PAYMENT_CONFIRMED': 'bg-blue-50 text-blue-700 border-blue-100',
        'ACCEPTED': 'bg-indigo-50 text-indigo-700 border-indigo-100',
        'PREPARING': 'bg-orange-50 text-orange-700 border-orange-100',
        'READY_FOR_PICKUP': 'bg-purple-50 text-purple-700 border-purple-100',
        'RIDER_ASSIGNED': 'bg-indigo-50 text-indigo-700 border-indigo-100',
        'PICKED_UP': 'bg-blue-50 text-blue-700 border-blue-100',
        'OUT_FOR_DELIVERY': 'bg-amber-50 text-amber-700 border-amber-100',
        'DELIVERED': 'bg-green-50 text-green-700 border-green-100',
        'CANCELLED': 'bg-red-50 text-red-700 border-red-100',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${styles[status] || styles['CREATED']}`}>
            {status.replace(/_/g, ' ')}
        </span>
    );
}

function TimelineStep({ title, time, isDone, description }: any) {
    return (
        <div className="flex items-start gap-3">
            <div className={`mt-1 w-2 h-2 rounded-full ${isDone ? 'bg-black' : 'bg-gray-300'}`} />
            <div className="flex-1 flex items-start justify-between">
                <div>
                    <p className={`text-sm ${isDone ? 'text-black' : 'text-gray-500'}`}>{title}</p>
                    {description && <p className="text-xs text-gray-400">{description}</p>}
                </div>
                <span className="text-xs text-gray-400">{time}</span>
            </div>
        </div>
    );
}

