import { supabase } from './supabaseClient';

export interface JobPosition {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    summary: string;
    is_active: boolean;
    created_at?: string;
}

export interface JobApplication {
    id: string;
    position_title: string;
    full_name: string;
    email: string;
    phone: string;
    city_area?: string;
    notice_period?: string;
    years_experience?: string;
    education_level?: string;
    resume_link?: string;
    linkedin_url?: string;
    current_company?: string;
    current_title?: string;
    scenario_answer?: string;
    why_muncheez?: string;
    expected_salary?: string;
    cover_note?: string;
    status: 'NEW' | 'REVIEWING' | 'INTERVIEW' | 'HIRED' | 'REJECTED';
    created_at: string;
}

const DEFAULT_POSITIONS: JobPosition[] = [
    {
        id: 'executive-assistant',
        title: 'Executive Assistant',
        department: 'Executive Office & Operations',
        location: 'Nairobi, Kenya',
        type: 'Full-time',
        summary: 'Provide high-level operational and administrative support directly to executive leadership, coordinating cross-functional schedules, strategic communications, and executive dispatch.',
        is_active: true,
        created_at: new Date().toISOString()
    }
];

const POSITIONS_KEY = 'muncheez_job_positions';
const APPLICATIONS_KEY = 'muncheez_job_applications';

export const careersService = {
    // 1. Fetch all active job positions
    async getPositions(): Promise<JobPosition[]> {
        try {
            const { data } = await supabase
                .from('job_positions')
                .select('*')
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                return data;
            }
        } catch (e) {
            // Table might not exist yet, proceed to local sync
        }

        const local = localStorage.getItem(POSITIONS_KEY);
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            } catch (e) {
                console.error('Error parsing local positions:', e);
            }
        }

        localStorage.setItem(POSITIONS_KEY, JSON.stringify(DEFAULT_POSITIONS));
        return DEFAULT_POSITIONS;
    },

    // 2. Add a new position (Admin)
    async addPosition(position: Omit<JobPosition, 'id' | 'created_at'>): Promise<JobPosition> {
        const newPos: JobPosition = {
            ...position,
            id: `job_${Date.now()}`,
            created_at: new Date().toISOString()
        };

        try {
            const { data } = await supabase
                .from('job_positions')
                .insert([newPos])
                .select()
                .single();

            if (data) {
                newPos.id = data.id;
            }
        } catch (e) {
            console.warn('Supabase job_positions insert fallback:', e);
        }

        const local = await this.getPositions();
        const updated = [newPos, ...local.filter(p => p.id !== newPos.id)];
        localStorage.setItem(POSITIONS_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('muncheez_positions_updated'));

        return newPos;
    },

    // 3. Delete position (Admin)
    async deletePosition(id: string): Promise<void> {
        try {
            await supabase.from('job_positions').delete().eq('id', id);
        } catch (e) {
            console.warn('Supabase job delete fallback:', e);
        }

        const local = await this.getPositions();
        const updated = local.filter(p => p.id !== id);
        localStorage.setItem(POSITIONS_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('muncheez_positions_updated'));
    },

    // 4. Submit a full detailed application
    async submitApplication(app: Omit<JobApplication, 'id' | 'status' | 'created_at'>): Promise<JobApplication> {
        const newApp: JobApplication = {
            ...app,
            id: `app_${Date.now()}`,
            status: 'NEW',
            created_at: new Date().toISOString()
        };

        // Try writing to job_applications table
        try {
            await supabase.from('job_applications').insert([newApp]);
        } catch (e) {
            console.warn('Notice writing to job_applications table:', e);
        }

        // Also write detailed entry to waitlist table
        try {
            const summaryNote = `Career: ${app.position_title} | Exp: ${app.years_experience || 'N/A'} | Area: ${app.city_area || 'N/A'} | Notice: ${app.notice_period || 'N/A'} | Sal: ${app.expected_salary || 'N/A'} | CV: ${app.resume_link || app.linkedin_url || 'N/A'}`;
            await supabase.from('waitlist').insert([{
                full_name: app.full_name,
                email: app.email,
                phone: app.phone || null,
                role: 'CUSTOMER',
                neighborhood: summaryNote.substring(0, 255),
                created_at: newApp.created_at
            }]);
        } catch (e) {
            console.warn('Notice writing to waitlist table:', e);
        }

        // Sync local storage for instant admin access
        const local = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || '[]');
        local.unshift(newApp);
        localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(local));
        window.dispatchEvent(new Event('muncheez_applications_updated'));

        return newApp;
    },

    // 5. Fetch all applications (Admin)
    async getApplications(): Promise<JobApplication[]> {
        let apps: JobApplication[] = [];

        try {
            const { data } = await supabase
                .from('job_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                apps = data;
            }
        } catch (e) {
            // fallback
        }

        const local = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || '[]');
        const map = new Map<string, JobApplication>();
        apps.forEach(a => map.set(a.id, a));
        local.forEach((a: JobApplication) => {
            if (!map.has(a.id)) {
                map.set(a.id, a);
            }
        });

        // Also extract from waitlist
        try {
            const { data: waitlistData } = await supabase
                .from('waitlist')
                .select('*')
                .ilike('neighborhood', '%Career:%')
                .order('created_at', { ascending: false });

            if (waitlistData) {
                waitlistData.forEach((w: any) => {
                    const id = `wl_${w.id}`;
                    if (!map.has(id)) {
                        const neighborhood = w.neighborhood || '';
                        const roleMatch = neighborhood.match(/Career:\s*([^|]+)/);
                        const cvMatch = neighborhood.match(/CV:\s*(.+)/);
                        map.set(id, {
                            id,
                            full_name: w.full_name,
                            email: w.email,
                            phone: w.phone || '',
                            position_title: roleMatch ? roleMatch[1].trim() : 'Executive Assistant',
                            resume_link: cvMatch ? cvMatch[1].trim() : '',
                            status: 'NEW',
                            created_at: w.created_at
                        });
                    }
                });
            }
        } catch (e) {
            // ignore
        }

        return Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    },

    // 6. Update application status (Admin)
    async updateApplicationStatus(id: string, status: JobApplication['status']): Promise<void> {
        try {
            await supabase.from('job_applications').update({ status }).eq('id', id);
        } catch (e) {
            console.warn('Update application status fallback:', e);
        }

        const local = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || '[]');
        const updated = local.map((a: JobApplication) => a.id === id ? { ...a, status } : a);
        localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('muncheez_applications_updated'));
    }
};
