import { useState, useEffect } from 'react';
import {
    Briefcase,
    Users,
    Plus,
    Search,
    ExternalLink,
    RefreshCw,
    Download,
    Trash2,
    CheckCircle2,
    Clock,
    X,
    Building2,
    MapPin,
    Edit2,
    Eye,
    EyeOff,
    Save
} from 'lucide-react';
import { careersService, JobPosition, JobApplication } from '../../lib/careersService';

export default function AdminCareers() {
    const [activeTab, setActiveTab] = useState<'APPLICATIONS' | 'POSITIONS'>('APPLICATIONS');
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [positions, setPositions] = useState<JobPosition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedAppModal, setSelectedAppModal] = useState<JobApplication | null>(null);

    // Add Position Form Modal
    const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDepartment, setNewDepartment] = useState('Executive & Operations');
    const [newLocation, setNewLocation] = useState('Nairobi, Kenya');
    const [newType, setNewType] = useState('Full-time');
    const [newSummary, setNewSummary] = useState('');
    const [newResponsibilities, setNewResponsibilities] = useState('');
    const [newRequirements, setNewRequirements] = useState('');
    const [isSavingPosition, setIsSavingPosition] = useState(false);

    // Edit Position Modal
    const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDepartment, setEditDepartment] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editType, setEditType] = useState('Full-time');
    const [editSummary, setEditSummary] = useState('');
    const [editResponsibilities, setEditResponsibilities] = useState('');
    const [editRequirements, setEditRequirements] = useState('');
    const [editIsActive, setEditIsActive] = useState(true);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [apps, pos] = await Promise.all([
                careersService.adminGetApplications(),
                careersService.adminGetPositions()
            ]);
            setApplications(apps);
            setPositions(pos);
        } catch (e) {
            console.error('Error loading careers data:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const handleAppUpdate = () => loadData();
        window.addEventListener('muncheez_applications_updated', handleAppUpdate);
        window.addEventListener('muncheez_positions_updated', handleAppUpdate);

        return () => {
            window.removeEventListener('muncheez_applications_updated', handleAppUpdate);
            window.removeEventListener('muncheez_positions_updated', handleAppUpdate);
        };
    }, []);

    const handleStatusChange = async (id: string, status: JobApplication['status']) => {
        await careersService.adminUpdateApplicationStatus(id, status);
        setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const handleCreatePosition = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newSummary.trim()) return;

        const responsibilities = newResponsibilities
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        const requirements = newRequirements
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        setIsSavingPosition(true);
        try {
            await careersService.adminAddPosition({
                title: newTitle.trim(),
                department: newDepartment.trim(),
                location: newLocation.trim(),
                type: newType.trim(),
                summary: newSummary.trim(),
                responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
                requirements: requirements.length > 0 ? requirements : undefined,
                is_active: true
            });

            setNewTitle('');
            setNewSummary('');
            setNewResponsibilities('');
            setNewRequirements('');
            setIsAddPositionOpen(false);
            await loadData();
        } catch (e) {
            console.error('Failed to create position:', e);
        } finally {
            setIsSavingPosition(false);
        }
    };

    const handleDeletePosition = async (id: string) => {
        if (!confirm('Are you sure you want to remove this position from the careers page?')) return;
        await careersService.adminDeletePosition(id);
        await loadData();
    };

    const openEditModal = (pos: JobPosition) => {
        setEditingPosition(pos);
        setEditTitle(pos.title);
        setEditDepartment(pos.department);
        setEditLocation(pos.location);
        setEditType(pos.type);
        setEditSummary(pos.summary);
        setEditResponsibilities((pos.responsibilities || []).join('\n'));
        setEditRequirements((pos.requirements || []).join('\n'));
        setEditIsActive(pos.is_active);
    };

    const closeEditModal = () => {
        setEditingPosition(null);
        setEditTitle('');
        setEditDepartment('');
        setEditLocation('');
        setEditType('Full-time');
        setEditSummary('');
        setEditResponsibilities('');
        setEditRequirements('');
        setEditIsActive(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPosition || !editTitle.trim() || !editSummary.trim()) return;

        const responsibilities = editResponsibilities
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        const requirements = editRequirements
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        setIsSavingEdit(true);
        try {
            await careersService.adminUpdatePosition(editingPosition.id, {
                title: editTitle.trim(),
                department: editDepartment.trim(),
                location: editLocation.trim(),
                type: editType.trim(),
                summary: editSummary.trim(),
                responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
                requirements: requirements.length > 0 ? requirements : undefined,
                is_active: editIsActive
            });
            closeEditModal();
            await loadData();
        } catch (e) {
            console.error('Failed to update position:', e);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleToggleActive = async (pos: JobPosition) => {
        await careersService.adminUpdatePosition(pos.id, { is_active: !pos.is_active });
        await loadData();
    };

    const filteredApplications = applications.filter(a => {
        const matchesSearch =
            a.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.position_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.phone?.includes(searchQuery);
        const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const exportApplicationsCSV = () => {
        const headers = ['ID', 'Candidate Name', 'Email', 'Phone', 'Role Applied', 'Resume/CV Link', 'Notes', 'Status', 'Applied At'];
        const rows = filteredApplications.map(a => [
            a.id,
            `"${a.full_name}"`,
            a.email,
            a.phone || '',
            `"${a.position_title}"`,
            `"${a.resume_link || ''}"`,
            `"${(a.cover_note || '').replace(/"/g, '""')}"`,
            a.status,
            a.created_at
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `muncheez_job_applications_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Briefcase className="text-[#4A90E2]" size={24} /> Careers & Recruitment
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">
                        Manage open positions on the public careers page and review incoming candidate applications.
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0">
                    <button
                        onClick={loadData}
                        className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> <span className="hidden sm:inline">Refresh</span>
                    </button>
                    {activeTab === 'APPLICATIONS' && (
                        <button
                            onClick={exportApplicationsCSV}
                            className="px-3 py-2 sm:px-4 sm:py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shadow-black/10 cursor-pointer whitespace-nowrap"
                        >
                            <Download size={16} /> <span className="hidden sm:inline">Export CSV</span> ({filteredApplications.length})
                        </button>
                    )}
                    {activeTab === 'POSITIONS' && (
                        <button
                            onClick={() => setIsAddPositionOpen(true)}
                            className="px-3 py-2 sm:px-4 sm:py-2.5 bg-[#4A90E2] text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer whitespace-nowrap"
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">Add Position</span>
                        </button>
                    )}
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex border-b border-gray-200 gap-4 sm:gap-8 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                    onClick={() => setActiveTab('APPLICATIONS')}
                    className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'APPLICATIONS'
                            ? 'border-black text-black'
                            : 'border-transparent text-gray-400 hover:text-black'
                    }`}
                >
                    <Users size={16} /> <span className="hidden sm:inline">Received Applications</span> ({applications.length})
                </button>
                <button
                    onClick={() => setActiveTab('POSITIONS')}
                    className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'POSITIONS'
                            ? 'border-black text-black'
                            : 'border-transparent text-gray-400 hover:text-black'
                    }`}
                >
                    <Building2 size={16} /> <span className="hidden sm:inline">Active Job Postings</span> ({positions.length})
                </button>
            </div>

            {/* TAB 1: APPLICATIONS LIST */}
            {activeTab === 'APPLICATIONS' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
                        <div className="relative w-full md:flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="text"
                                placeholder="Search candidate by name, email, role, or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:outline-none focus:border-gray-200 transition-all"
                            />
                        </div>

                        <div className="flex items-center p-1 bg-gray-100 rounded-xl overflow-x-auto w-full md:w-auto">
                            {(['ALL', 'NEW', 'REVIEWING', 'INTERVIEW', 'HIRED', 'REJECTED'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                                        statusFilter === s ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-black'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Applications Table */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {filteredApplications.length === 0 ? (
                            <div className="p-16 text-center">
                                <Briefcase className="mx-auto mb-4 text-gray-200" size={48} />
                                <p className="text-gray-400 font-medium">No job applications found matching filter.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                            <th className="p-4">Candidate</th>
                                            <th className="p-4">Role Applied</th>
                                            <th className="p-4">Contact</th>
                                            <th className="p-4">Resume / CV</th>
                                            <th className="p-4">Notes</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Applied Date</th>
                                            <th className="p-4 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {filteredApplications.map(app => (
                                            <tr key={app.id} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="p-4 font-bold text-gray-900">
                                                    {app.full_name}
                                                </td>
                                                <td className="p-4">
                                                    <span className="inline-block px-2.5 py-1 bg-blue-50 text-[#4A90E2] text-xs font-semibold rounded-md">
                                                        {app.position_title}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs font-mono text-gray-600">
                                                    <div>{app.email}</div>
                                                    {app.phone && <div className="text-gray-400">{app.phone}</div>}
                                                </td>
                                                <td className="p-4">
                                                    {app.resume_link ? (
                                                        <a
                                                            href={app.resume_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                                                        >
                                                            View CV <ExternalLink size={12} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-300">None</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-xs text-gray-500 max-w-xs truncate" title={app.cover_note}>
                                                    {app.cover_note || '—'}
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={app.status}
                                                        onChange={(e) => handleStatusChange(app.id, e.target.value as any)}
                                                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border cursor-pointer ${
                                                            app.status === 'NEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            app.status === 'REVIEWING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            app.status === 'INTERVIEW' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                            app.status === 'HIRED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            'bg-gray-100 text-gray-500 border-gray-200'
                                                        }`}
                                                    >
                                                        <option value="NEW">NEW</option>
                                                        <option value="REVIEWING">REVIEWING</option>
                                                        <option value="INTERVIEW">INTERVIEW</option>
                                                        <option value="HIRED">HIRED</option>
                                                        <option value="REJECTED">REJECTED</option>
                                                    </select>
                                                </td>
                                                <td className="p-4 text-xs text-gray-400 font-mono whitespace-nowrap">
                                                    {new Date(app.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => setSelectedAppModal(app)}
                                                        className="px-3 py-1 bg-gray-100 hover:bg-black hover:text-white text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        Full File
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: ACTIVE POSITIONS LIST */}
            {activeTab === 'POSITIONS' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
                        {positions.length === 0 ? (
                            <div className="p-16 text-center text-gray-400">
                                No job positions currently posted. Click "Add Position" above to post a role to the public careers page.
                            </div>
                        ) : (
                            positions.map((pos) => (
                                <div key={pos.id} className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 hover:bg-gray-50/50 transition-colors">
                                    <div className="max-w-2xl space-y-2 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                {pos.department}
                                            </span>
                                            <span className="text-gray-300">&bull;</span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                                <MapPin size={12} /> {pos.location}
                                            </span>
                                            <span className="text-gray-300">&bull;</span>
                                            <span className="text-xs text-gray-500 font-medium">
                                                {pos.type}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 break-words">{pos.title}</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed break-words">{pos.summary}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${pos.is_active ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-100'}`}>
                                            {pos.is_active ? <CheckCircle2 size={12} /> : <EyeOff size={12} />}
                                            {pos.is_active ? 'Active' : 'Hidden'}
                                        </span>
                                        <button
                                            onClick={() => handleToggleActive(pos)}
                                            className={`p-2 rounded-lg transition-colors ${pos.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                                            title={pos.is_active ? 'Hide from careers page' : 'Show on careers page'}
                                        >
                                            {pos.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <button
                                            onClick={() => openEditModal(pos)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                            title="Edit Position"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePosition(pos.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                            title="Delete Position"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ADD POSITION MODAL */}
            {isAddPositionOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl p-5 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Add New Career Position</h2>
                            <button
                                onClick={() => setIsAddPositionOpen(false)}
                                className="text-gray-400 hover:text-black cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePosition} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Job Title *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Executive Assistant"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={newDepartment}
                                        onChange={(e) => setNewDepartment(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={newLocation}
                                        onChange={(e) => setNewLocation(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Employment Type</label>
                                <select
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black cursor-pointer"
                                >
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Role Summary *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Describe the role overview..."
                                    value={newSummary}
                                    onChange={(e) => setNewSummary(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Responsibilities (one per line)</label>
                                <textarea
                                    rows={3}
                                    placeholder={"Coordinate executive schedule, meetings, and agendas\nManage executive communications and follow-ups\nSupport day-to-day administrative operations"}
                                    value={newResponsibilities}
                                    onChange={(e) => setNewResponsibilities(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Requirements (one per line)</label>
                                <textarea
                                    rows={3}
                                    placeholder={"Experience in executive administrative support\nStrong communication in English & Swahili\nBased full-time in Nairobi"}
                                    value={newRequirements}
                                    onChange={(e) => setNewRequirements(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddPositionOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPosition}
                                    className="px-5 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 cursor-pointer disabled:opacity-50"
                                >
                                    {isSavingPosition ? 'Publishing...' : 'Publish to Careers Page'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT POSITION MODAL */}
            {editingPosition && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl p-5 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Edit Career Position</h2>
                            <button
                                onClick={closeEditModal}
                                className="text-gray-400 hover:text-black cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Job Title *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Executive Assistant"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={editDepartment}
                                        onChange={(e) => setEditDepartment(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={editLocation}
                                        onChange={(e) => setEditLocation(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Employment Type</label>
                                <select
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black cursor-pointer"
                                >
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Role Summary *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Describe the role overview..."
                                    value={editSummary}
                                    onChange={(e) => setEditSummary(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Responsibilities (one per line)</label>
                                <textarea
                                    rows={3}
                                    placeholder={"Coordinate executive schedule, meetings, and agendas\nManage executive communications and follow-ups\nSupport day-to-day administrative operations"}
                                    value={editResponsibilities}
                                    onChange={(e) => setEditResponsibilities(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Requirements (one per line)</label>
                                <textarea
                                    rows={3}
                                    placeholder={"Experience in executive administrative support\nStrong communication in English & Swahili\nBased full-time in Nairobi"}
                                    value={editRequirements}
                                    onChange={(e) => setEditRequirements(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editIsActive}
                                        onChange={(e) => setEditIsActive(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-gray-700">Visible on public Careers page</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingEdit}
                                        className="px-5 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Save size={14} /> {isSavingEdit ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CANDIDATE FULL DOSSIER MODAL */}
            {selectedAppModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block mb-1">
                                    Candidate Dossier &bull; {selectedAppModal.position_title}
                                </span>
                                <h2 className="text-2xl font-bold text-gray-900">{selectedAppModal.full_name}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedAppModal(null)}
                                className="text-gray-400 hover:text-black cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl">
                            <div>
                                <span className="text-xs text-gray-400 block font-bold uppercase">Email</span>
                                <p className="font-medium text-gray-800">{selectedAppModal.email}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 block font-bold uppercase">Phone</span>
                                <p className="font-medium text-gray-800">{selectedAppModal.phone || '—'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 block font-bold uppercase">Location</span>
                                <p className="font-medium text-gray-800">{selectedAppModal.city_area || 'Nairobi'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 block font-bold uppercase">Notice Period</span>
                                <p className="font-medium text-gray-800">{selectedAppModal.notice_period || 'Immediate'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 block font-bold uppercase">Experience</span>
                                <p className="font-medium text-gray-800">{selectedAppModal.years_experience || '—'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 block font-bold uppercase">Expected Salary</span>
                                <p className="font-medium text-gray-800">{selectedAppModal.expected_salary || '—'}</p>
                            </div>
                        </div>

                        {/* Resume and Links */}
                        <div className="space-y-2">
                            <span className="text-xs text-gray-400 block font-bold uppercase">Candidate Links</span>
                            <div className="flex gap-4">
                                {selectedAppModal.resume_link ? (
                                    <a
                                        href={selectedAppModal.resume_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-blue-100"
                                    >
                                        Open CV / Resume <ExternalLink size={13} />
                                    </a>
                                ) : (
                                    <span className="text-xs text-gray-400">No CV link</span>
                                )}

                                {selectedAppModal.linkedin_url && (
                                    <a
                                        href={selectedAppModal.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-gray-200"
                                    >
                                        LinkedIn Profile <ExternalLink size={13} />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Scenario Answer */}
                        {selectedAppModal.scenario_answer && (
                            <div className="space-y-1 border-t pt-4">
                                <span className="text-xs text-gray-400 block font-bold uppercase">
                                    Conflicting Priorities Scenario Response
                                </span>
                                <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                                    {selectedAppModal.scenario_answer}
                                </p>
                            </div>
                        )}

                        {/* Why Muncheez */}
                        {selectedAppModal.why_muncheez && (
                            <div className="space-y-1 border-t pt-4">
                                <span className="text-xs text-gray-400 block font-bold uppercase">Why Muncheez</span>
                                <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">
                                    {selectedAppModal.why_muncheez}
                                </p>
                            </div>
                        )}

                        {/* Status Update in Dossier */}
                        <div className="border-t pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-700">Application Status:</span>
                                <select
                                    value={selectedAppModal.status}
                                    onChange={(e) => {
                                        const newStatus = e.target.value as any;
                                        handleStatusChange(selectedAppModal.id, newStatus);
                                        setSelectedAppModal(prev => prev ? { ...prev, status: newStatus } : null);
                                    }}
                                    className="text-xs font-bold px-3 py-1.5 border rounded-lg"
                                >
                                    <option value="NEW">NEW</option>
                                    <option value="REVIEWING">REVIEWING</option>
                                    <option value="INTERVIEW">INTERVIEW</option>
                                    <option value="HIRED">HIRED</option>
                                    <option value="REJECTED">REJECTED</option>
                                </select>
                            </div>
                            <button
                                onClick={() => setSelectedAppModal(null)}
                                className="px-5 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 cursor-pointer"
                            >
                                Close Dossier
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
