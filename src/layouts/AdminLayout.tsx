import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    CheckCircle2,
    ShoppingBag,
    Store,
    Bike,
    Users,
    Package,
    TrendingUp,
    Megaphone,
    MessageSquare,
    Settings,
    LogOut,
    Search,
    Bell,
    ChevronDown,
    Menu,
    X,
    Sparkles,
    Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { signOut } = useAuth();

    const handleLogout = async () => {
        await signOut();
        navigate('/admin/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: "Overview", path: "/admin" },
        { icon: CheckCircle2, label: "Approvals", path: "/admin/approvals" },
        { icon: Sparkles, label: "VIP Waitlist", path: "/admin/waitlist" },
        { icon: Briefcase, label: "Careers", path: "/admin/careers" },
        { icon: ShoppingBag, label: "Orders", path: "/admin/orders" },
        { icon: Store, label: "Merchants", path: "/admin/merchants" },
        { icon: Bike, label: "Riders", path: "/admin/riders" },
        { icon: Users, label: "Customers", path: "/admin/customers" },
        { icon: Package, label: "Inventory", path: "/admin/inventory" },
        { icon: TrendingUp, label: "Financials", path: "/admin/financials" },
        { icon: Megaphone, label: "Marketing", path: "/admin/marketing" },
        { icon: MessageSquare, label: "Support", path: "/admin/support" },
        { icon: Settings, label: "Settings", path: "/admin/settings" },
    ];

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const isCollapsed = false;

    return (
        <div className="min-h-screen bg-[#F5F5F7] font-sans text-[#1D1D1F] flex">
            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex w-64 bg-white border-r border-black/5 h-screen sticky top-0 flex-col z-20">
                <div className="h-16 flex items-center px-6 border-b border-black/5">
                    <span className="font-heading font-bold text-xl tracking-tight">
                        Muncheez<span className="text-[#0066CC]">.</span>
                    </span>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-colors rounded-lg ${isActive(item.path)
                                ? 'bg-black text-white'
                                : 'text-[#6E6E73] hover:bg-black/5 hover:text-black'
                                }`}
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-3 border-t border-black/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-[#FF3B30] hover:bg-[#FF3B30]/5 transition-colors rounded-lg"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                    <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-black/5 transition-colors cursor-pointer">
                        <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-[11px]">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold truncate">Admin User</p>
                            <p className="text-[10px] text-[#8E8E93] truncate">Super Admin</p>
                        </div>
                        <ChevronDown size={14} className="text-[#8E8E93]" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-black/5 sticky top-0 z-10 px-4 lg:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 text-[#6E6E73] hover:bg-black/5 rounded-lg"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>

                        {/* Global Search */}
                        <div className="hidden md:flex items-center relative w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" size={16} />
                            <input
                                type="text"
                                placeholder="Search orders, users, transactions... (Cmd+K)"
                                className="w-full pl-10 pr-4 py-2 bg-black/5 border border-transparent rounded-lg text-sm focus:outline-none focus:bg-white focus:border-black/10 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-[#8E8E93] hover:text-black hover:bg-black/5 rounded-lg transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF3B30] rounded-full border-2 border-white" />
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <aside className="absolute top-0 left-0 w-64 bg-white h-full shadow-2xl flex flex-col">
                        <div className="h-16 flex items-center justify-between px-6 border-b border-black/5">
                            <span className="font-heading font-bold text-xl tracking-tight">
                                Muncheez<span className="text-[#0066CC]">.</span>
                            </span>
                            <button onClick={() => setIsMobileMenuOpen(false)}>
                                <X size={24} className="text-[#8E8E93]" />
                            </button>
                        </div>
                        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-colors rounded-lg ${isActive(item.path)
                                        ? 'bg-black text-white'
                                        : 'text-[#6E6E73] hover:bg-black/5 hover:text-black'
                                        }`}
                                >
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="p-3 border-t border-black/5">
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    handleLogout();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-[#FF3B30] hover:bg-[#FF3B30]/5 transition-colors rounded-lg"
                            >
                                <LogOut size={18} />
                                <span>Log Out</span>
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
