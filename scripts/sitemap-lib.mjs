import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Minimal .env loader — does not overwrite already-set process.env values. */
export function loadEnv(files = ['.env', '.env.local']) {
    for (const file of files) {
        const full = resolve(ROOT, file);
        if (!existsSync(full)) continue;
        for (const rawLine of readFileSync(full, 'utf8').split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) continue;
            const eq = line.indexOf('=');
            if (eq === -1) continue;
            const key = line.slice(0, eq).trim();
            let value = line.slice(eq + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            if (!(key in process.env)) process.env[key] = value;
        }
    }
    return process.env;
}

export function xmlEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** Normalises any date-ish value to a W3C datetime (UTC, ISO-8601). */
export function toIsoDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Last modification date of a repo file, taken from git history.
 * Falls back to null when git is unavailable or the file is untracked.
 */
export function gitLastmod(relPath) {
    if (!relPath) return null;
    try {
        const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        const value = out.trim();
        return value ? toIsoDate(value) : null;
    } catch {
        return null;
    }
}

/**
 * Query a Supabase table over PostgREST.
 * Returns [] on any failure so a build never breaks on a network hiccup.
 */
export async function supabaseRest(table, query = '', fallbackQuery = '') {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.warn(`  ! ${table}: Supabase credentials missing — skipping live fetch`);
        return [];
    }

    const base = url.replace(/\/$/, '');
    const attempt = async (q) => {
        const res = await fetch(`${base}/rest/v1/${table}${q ? `?${q}` : ''}`, {
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                Accept: 'application/json',
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    };

    try {
        return await attempt(query);
    } catch (err) {
        if (!fallbackQuery) {
            console.warn(`  ! ${table}: ${err.message} — skipping`);
            return [];
        }
        try {
            const rows = await attempt(fallbackQuery);
            console.warn(`  · ${table}: fell back to reduced column set (${err.message})`);
            return rows;
        } catch (err2) {
            console.warn(`  ! ${table}: ${err2.message} — skipping`);
            return [];
        }
    }
}

/** Builds one <url> entry. */
export function renderUrlEntry({ loc, lastmod, changefreq, priority, images = [], alternates = [] }) {
    const lines = ['  <url>', `    <loc>${xmlEscape(loc)}</loc>`];
    if (lastmod) lines.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`);
    if (changefreq) lines.push(`    <changefreq>${xmlEscape(changefreq)}</changefreq>`);
    if (priority !== undefined && priority !== null) lines.push(`    <priority>${xmlEscape(priority)}</priority>`);

    if (alternates.length) {
        lines.push('    <xhtml:link rel="alternate" hreflang="en" href="' + xmlEscape(loc) + '"/>');
        lines.push('    <xhtml:link rel="alternate" hreflang="x-default" href="' + xmlEscape(loc) + '"/>');
    }

    for (const image of images) {
        lines.push('    <image:image>');
        lines.push(`      <image:loc>${xmlEscape(image.loc)}</image:loc>`);
        if (image.title) lines.push(`      <image:title>${xmlEscape(image.title)}</image:title>`);
        if (image.caption) lines.push(`      <image:caption>${xmlEscape(image.caption)}</image:caption>`);
        if (image.license) lines.push(`      <image:license>${xmlEscape(image.license)}</image:license>`);
        lines.push('    </image:image>');
    }

    lines.push('  </url>');
    return lines.join('\n');
}

export function renderUrlSet(entries) {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ...entries,
        '</urlset>',
        '',
    ].join('\n');
}

export function renderSitemapIndex(children) {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...children,
        '</sitemapindex>',
        '',
    ].join('\n');
}

export function renderIndexChild({ loc, lastmod, changefreq, priority }) {
    const lines = ['  <sitemap>', `    <loc>${xmlEscape(loc)}</loc>`];
    if (lastmod) lines.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`);
    if (changefreq) lines.push(`    <changefreq>${xmlEscape(changefreq)}</changefreq>`);
    if (priority !== undefined && priority !== null) lines.push(`    <priority>${xmlEscape(priority)}</priority>`);
    lines.push('  </sitemap>');
    return lines.join('\n');
}

export function writeFile(relPath, content) {
    const full = resolve(ROOT, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
    return full;
}

export function fileExists(relPath) {
    return existsSync(resolve(ROOT, relPath));
}
