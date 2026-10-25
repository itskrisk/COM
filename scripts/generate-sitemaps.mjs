/**
 * Generates the Muncheez sitemap suite.
 *
 * Outputs (public/):
 *   sitemap.xml          — sitemap index (entry point for crawlers)
 *   sitemap-pages.xml    — core, corporate, legal and marketing pages
 *   sitemap-stores.xml   — live storefronts (from Supabase, image sitemap)
 *   sitemap-jobs.xml     — live job openings (from Supabase)
 *
 * Run: npm run sitemap
 * <lastmod> for static pages comes from git history of the page source,
 * so it reflects the last real content change — not the build time.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    ROOT,
    gitLastmod,
    loadEnv,
    renderIndexChild,
    renderSitemapIndex,
    renderUrlEntry,
    renderUrlSet,
    supabaseRest,
    toIsoDate,
    writeFile,
} from './sitemap-lib.mjs';
import { SITE_URL, STATIC_PAGES } from './sitemap.config.mjs';

loadEnv();

const GENERATED_AT = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

function absolute(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function cacheFile() {
    return resolve(ROOT, 'scripts/.sitemap-cache.json');
}

function readCache() {
    try {
        return JSON.parse(readFileSync(cacheFile(), 'utf8'));
    } catch {
        return null;
    }
}

function writeCache(payload) {
    try {
        writeFileSync('scripts/.sitemap-cache.json', JSON.stringify(payload, null, 2), 'utf8');
    } catch {
        /* cache is best-effort */
    }
}

// ── Static pages ────────────────────────────────────────────────────────────
function buildPageEntries() {
    return STATIC_PAGES.map((page) => {
        const images = page.image
            ? [{ loc: absolute(page.image), title: 'Muncheez', caption: 'Muncheez — delivery in Nairobi' }]
            : [];
        return {
            loc: absolute(page.path),
            lastmod: gitLastmod(page.source) || GENERATED_AT,
            changefreq: page.changefreq,
            priority: page.priority,
            images,
            alternates: true,
        };
    });
}

// ── Storefronts ─────────────────────────────────────────────────────────────
async function buildStoreEntries() {
    const rows = await supabaseRest(
        'merchants',
        'select=id,business_name,type,description,cover_url,logo_url,status,is_active,created_at,updated_at' +
            '&status=eq.APPROVED&is_active=eq.true&order=business_name.asc',
        'select=id,business_name,type,description,cover_url,logo_url,status,is_active,created_at' +
            '&status=eq.APPROVED&is_active=eq.true&order=business_name.asc'
    );

    if (!rows.length) {
        const cached = readCache();
        if (cached?.stores?.length) {
            console.log(`  · stores: using cached snapshot (${cached.stores.length})`);
            return cached.stores;
        }
        return [];
    }

    const entries = rows.map((m) => {
        const cover = m.cover_url || m.logo_url;
        const images = [];
        if (cover) {
            images.push({
                loc: absolute(cover),
                title: m.business_name,
                caption: `${m.business_name}${m.type ? ` — ${m.type} delivery in Nairobi` : ''}`.slice(0, 300),
            });
        }
        return {
            loc: absolute(`/stores/${m.id}`),
            lastmod: toIsoDate(m.updated_at) || toIsoDate(m.created_at) || GENERATED_AT,
            changefreq: 'weekly',
            priority: '0.7',
            images,
            alternates: true,
        };
    });

    writeCache({ stores: entries, generatedAt: GENERATED_AT });
    return entries;
}

// ── Jobs ────────────────────────────────────────────────────────────────────
async function buildJobEntries() {
    const rows = await supabaseRest(
        'job_positions',
        'select=id,title,department,location,type,created_at,is_active&is_active=eq.true&order=created_at.desc'
    );

    if (!rows.length) {
        const cached = readCache();
        if (cached?.jobs?.length) {
            console.log(`  · jobs: using cached snapshot (${cached.jobs.length})`);
            return cached.jobs;
        }
        return [];
    }

    const entries = rows.map((job) => ({
        loc: absolute(`/company/careers/apply/${job.id}`),
        lastmod: toIsoDate(job.created_at) || GENERATED_AT,
        changefreq: 'weekly',
        priority: '0.6',
        images: [],
        alternates: true,
    }));

    const cached = readCache() || {};
    writeCache({ ...cached, jobs: entries, generatedAt: GENERATED_AT });
    return entries;
}

async function main() {
    console.log(`\nMuncheez sitemap generator — ${GENERATED_AT}\n`);

    const pageEntries = buildPageEntries();
    const storeEntries = await buildStoreEntries();
    const jobEntries = await buildJobEntries();

    const children = [];

    const pagesXml = renderUrlSet(pageEntries.map(renderUrlEntry));
    writeFile('public/sitemap-pages.xml', pagesXml);
    children.push(
        renderIndexChild({
            loc: `${SITE_URL}/sitemap-pages.xml`,
            lastmod: GENERATED_AT,
            changefreq: 'weekly',
            priority: '1.0',
        })
    );
    console.log(`  ✓ sitemap-pages.xml   ${pageEntries.length} URLs`);

    writeFile('public/sitemap-stores.xml', renderUrlSet(storeEntries.map(renderUrlEntry)));
    if (storeEntries.length) {
        children.push(
            renderIndexChild({
                loc: `${SITE_URL}/sitemap-stores.xml`,
                lastmod: GENERATED_AT,
                changefreq: 'daily',
                priority: '0.9',
            })
        );
        console.log(`  ✓ sitemap-stores.xml  ${storeEntries.length} URLs`);
    } else {
        console.log('  · sitemap-stores.xml  0 live storefronts — written empty, omitted from index');
    }

    writeFile('public/sitemap-jobs.xml', renderUrlSet(jobEntries.map(renderUrlEntry)));
    if (jobEntries.length) {
        children.push(
            renderIndexChild({
                loc: `${SITE_URL}/sitemap-jobs.xml`,
                lastmod: GENERATED_AT,
                changefreq: 'weekly',
                priority: '0.7',
            })
        );
        console.log(`  ✓ sitemap-jobs.xml    ${jobEntries.length} URLs`);
    } else {
        console.log('  · sitemap-jobs.xml    0 open roles — written empty, omitted from index');
    }

    writeFile('public/sitemap.xml', renderSitemapIndex(children));
    console.log(`  ✓ sitemap.xml          index → ${children.length} child sitemaps`);
    console.log('\nDone.\n');
}

main().catch((err) => {
    console.error('Sitemap generation failed:', err);
    process.exit(1);
});
