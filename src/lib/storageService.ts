import { supabase } from './supabaseClient';

export interface UploadResult {
    url: string | null;
    path: string | null;
    error: string | null;
}

/**
 * Uploads a file to Supabase Storage (e.g. documents, products, logos).
 * If the bucket doesn't exist or fails with RLS/network issues, falls back to a base64 data URL
 * so that the document/image is NEVER lost and is immediately viewable by the user and Admin.
 */
export async function uploadFile(
    bucket: string,
    folder: string,
    file: File
): Promise<UploadResult> {
    const ext = file.name.split('.').pop() || 'dat';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.warn(`[storage] Supabase upload to bucket "${bucket}" failed, falling back to data URL:`, error.message);
            const dataUrl = await fileToDataUrl(file);
            return {
                url: dataUrl,
                path: filePath,
                error: null
            };
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return {
            url: publicUrlData.publicUrl,
            path: data.path,
            error: null
        };
    } catch (err: any) {
        console.warn(`[storage] Storage exception, using data URL fallback:`, err?.message);
        try {
            const dataUrl = await fileToDataUrl(file);
            return {
                url: dataUrl,
                path: filePath,
                error: null
            };
        } catch (readErr: any) {
            return {
                url: null,
                path: null,
                error: readErr?.message || 'Failed to read file'
            };
        }
    }
}

/**
 * Convert a File object to a base64 Data URL (safe for viewing in PDF/images).
 */
export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}
