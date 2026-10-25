/**
 * Validates the generated sitemap suite.
 *
 * Checks: XML well-formedness, absolute loc URLs on the canonical host,
 * no noindex paths, no duplicate URLs, ISO-8601 lastmod, sitemap limits.
 *
 * Run: npm run sitemap:validate
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, loadEnv } from './sitemap-lib.mjs';
import { INDEXABLE_EXCEPTIONS, NOINDEX_PREFIXES, SITE_URL } from './sitemap.config.mjs';

loadEnv();

const MAX_URLS_PER_FILE = 50000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const errors = [];
const warnings = [];
const allLocs = new Map();

function fail(msg) {
    errors.push(msg);
}

function warn(msg) {
    warnings.push(msg);
}

function checkWellFormed(xml, file) {
    const opens = (xml.match(/<urlset[\s>]/g) || []).length + (xml.match(/<sitemapindex[\s>]/g) || []).length;
    const closes = (xml.match(/<\/urlset>/g) || []).length + (xml.match(/<\/sitemapindex>/g) || []).length;
    if (opens !== 1 || closes !== 1) fail(`${file}: expected exactly one root element, found ${opens}/${closes}`);
    if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) fail(`${file}: missing XML declaration`);
    const urlOpen = (xml.match(/<url>/g) || []).length;
    const urlClose = (xml.match(/<\/url>/g) || []).length;
    if (urlOpen !== urlClose) fail(`${file}: unbalanced <url> tags (${urlOpen}/${urlClose})`);
    const smOpen = (xml.match(/<sitemap>/g) || []).length;
    const smClose = (xml.match(/<\/sitemap>/g) || []).length;
    if (smOpen !== smClose) fail(`${file}: unbalanced <sitemap> tags (${smOpen}/${smClose})`);
    return { urlOpen, smOpen };
}

function checkLoc(loc, file, kind) {
    if (!/^https:\/\//i.test(loc)) {
        fail(`${file}: ${kind} loc is not absolute HTTPS — ${loc}`);
        return;
    }
    if (!loc.startsWith(SITE_URL)) {
        fail(`${file}: ${kind} loc is off canonical host — ${loc}`);
    }
    const path = loc.replace(SITE_URL, '').split('?')[0];
    if (!INDEXABLE_EXCEPTIONS?.includes(path)) {
        for (const prefix of NOINDEX_PREFIXES) {
            if (path === prefix || path.startsWith(`${prefix}/`)) {
                fail(`${file}: noindex path present in sitemap — ${path}`);
            }
        }
    }
    if (allLocs.has(loc)) {
        fail(`${file}: duplicate URL — ${loc} (also in ${allLocs.get(loc)})`);
    } else {
        allLocs.set(loc, file);
    }
}

function checkLastmod(value, file) {
    if (!value) return;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
        fail(`${file}: lastmod is not a valid W3C datetime — ${value}`);
    }
}

function validateUrlSet(file, xml) {
    const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
    if (blocks.length > MAX_URLS_PER_FILE) fail(`${file}: ${blocks.length} URLs exceeds the 50,000 limit`);
    for (const block of blocks) {
        const loc = (block.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1];
        if (!loc) {
            fail(`${file}: <url> entry without <loc>`);
            continue;
        }
        checkLoc(loc.trim(), file, 'url');
        const lastmod = (block.match(/<lastmod>([\s\S]*?)<\/lastmod>/) || [])[1];
        checkLastmod(lastmod?.trim(), file);
        const imageLocs = block.match(/<image:loc>([\s\S]*?)<\/image:loc>/g) || [];
        for (const il of imageLocs) {
            const value = il.replace(/<\/?image:loc>/g, '').trim();
            if (!/^https:\/\//i.test(value)) fail(`${file}: image loc is not absolute HTTPS — ${value}`);
        }
    }
    return blocks.length;
}

function validateIndex(file, xml) {
    const blocks = xml.match(/<sitemap>[\s\S]*?<\/sitemap>/g) || [];
    if (blocks.length > MAX_URLS_PER_FILE) fail(`${file}: ${blocks.length} child sitemaps exceeds the 50,000 limit`);
    for (const block of blocks) {
        const loc = (block.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1];
        if (!loc) {
            fail(`${file}: <sitemap> entry without <loc>`);
            continue;
        }
        checkLoc(loc.trim(), file, 'sitemap');
        const lastmod = (block.match(/<lastmod>([\s\S]*?)<\/lastmod>/) || [])[1];
        checkLastmod(lastmod?.trim(), file);
    }
    return blocks.length;
}

function main() {
    const publicDir = resolve(ROOT, 'public');
    const files = readdirSync(publicDir).filter((f) => f.startsWith('sitemap') && f.endsWith('.xml')).sort();

    if (!files.includes('sitemap.xml')) fail('public/sitemap.xml (sitemap index) is missing');
    if (!files.includes('sitemap-pages.xml')) fail('public/sitemap-pages.xml is missing');

    let totalUrls = 0;
    for (const name of files) {
        const path = resolve(publicDir, name);
        const size = statSync(path).size;
        if (size > MAX_FILE_BYTES) fail(`${name}: ${size} bytes exceeds the 50MB limit`);

        const xml = readFileSync(path, 'utf8');
        checkWellFormed(xml, name);

        const count = xml.includes('<sitemapindex') ? validateIndex(name, xml) : validateUrlSet(name, xml);
        totalUrls += count;
        console.log(`  ${name.padEnd(24)} ${String(count).padStart(5)} entries  ${(size / 1024).toFixed(1)} KB`);
    }

    // robots.txt must point at the index
    try {
        const robots = readFileSync(resolve(publicDir, 'robots.txt'), 'utf8');
        if (!robots.includes('Sitemap: https://muncheez.co.ke/sitemap.xml')) {
            fail('robots.txt: missing "Sitemap: https://muncheez.co.ke/sitemap.xml"');
        }
    } catch {
        fail('robots.txt is missing');
    }

    console.log(`\n  ${totalUrls} unique URLs across ${files.length} sitemap files`);

    if (warnings.length) {
        console.log('\nWarnings:');
        warnings.forEach((w) => console.log(`  ! ${w}`));
    }

    if (errors.length) {
        console.log('\nFAILED:');
        errors.forEach((e) => console.log(`  x ${e}`));
        process.exit(1);
    }

    console.log('\nAll sitemap checks passed.\n');
}

main();
