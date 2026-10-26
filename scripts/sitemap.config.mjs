/**
 * Sitemap configuration — canonical catalogue of indexable routes.
 *
 * Source of truth for:
 *   - scripts/generate-sitemaps.mjs  (build-time generation)
 *   - scripts/validate-sitemaps.mjs  (CI validation)
 *   - public/robots.txt              (kept in sync manually)
 */

export const SITE_URL = 'https://muncheez.co.ke';

/** Paths that must never appear in a sitemap (mirrors robots.txt Disallow). */
export const NOINDEX_PREFIXES = [
    '/login',
    '/signup',
    '/auth',
    '/checkout',
    '/order',
    '/merchant',
    '/rider',
    '/admin',
    '/partner',
    '/courier',
    '/coming-soon',
    '/social',
    '/pending-approval',
    '/rejected',
    '/suspended',
];

/** Specific indexable exceptions that override the prefix disallow. */
export const INDEXABLE_EXCEPTIONS = [
    '/merchant/signup',
    '/rider/signup',
];

/**
 * Static, always-indexable pages.
 * `source` is the repo file whose last git commit drives <lastmod>.
 */
export const STATIC_PAGES = [
    { path: '/', source: 'src/pages/customer/Home.tsx', changefreq: 'daily', priority: '1.0', image: '/logos/urlimage.jpg' },
    { path: '/stores', source: 'src/pages/customer/StoreListing.tsx', changefreq: 'daily', priority: '0.9', image: '/logos/urlimage.jpg' },
    { path: '/company/story', source: 'src/pages/common/OurStory.tsx', changefreq: 'monthly', priority: '0.6' },
    { path: '/company/team', source: 'src/pages/common/OurTeam.tsx', changefreq: 'monthly', priority: '0.5' },
    { path: '/company/news', source: 'src/pages/common/Newsroom.tsx', changefreq: 'weekly', priority: '0.7' },
    { path: '/company/news/press-releases', source: 'src/pages/common/PressReleases.tsx', changefreq: 'weekly', priority: '0.6' },
    { path: '/company/news/media-kit', source: 'src/pages/common/MediaKit.tsx', changefreq: 'monthly', priority: '0.5' },
    { path: '/company/news/corporate', source: 'src/pages/common/CorporateInfo.tsx', changefreq: 'monthly', priority: '0.5' },
    { path: '/company/investors', source: 'src/pages/common/InvestorRelations.tsx', changefreq: 'monthly', priority: '0.6' },
    { path: '/waitlist', source: 'src/pages/common/WaitlistPage.tsx', changefreq: 'weekly', priority: '0.5' },
    { path: '/terms', source: 'src/pages/common/LegalPage.tsx', changefreq: 'yearly', priority: '0.2' },
    { path: '/privacy', source: 'src/pages/common/LegalPage.tsx', changefreq: 'yearly', priority: '0.2' },
    { path: '/cookies', source: 'src/pages/common/LegalPage.tsx', changefreq: 'yearly', priority: '0.2' },
    { path: '/contact', source: 'src/pages/common/LegalPage.tsx', changefreq: 'monthly', priority: '0.6' },
    { path: '/help', source: 'src/pages/common/LegalPage.tsx', changefreq: 'monthly', priority: '0.6' },
    { path: '/help/faq', source: 'src/pages/common/LegalPage.tsx', changefreq: 'weekly', priority: '0.7' },
    { path: '/merchant/signup', source: 'src/pages/merchant/PartnerSignup.tsx', changefreq: 'monthly', priority: '0.7', image: '/logos/urlimage.jpg' },
    { path: '/rider/signup', source: 'src/pages/courier/Signup.tsx', changefreq: 'monthly', priority: '0.7', image: '/logos/urlimage.jpg' },
];

/** Hreflang alternates emitted for every URL (site is English-only). */
export const ALTERNATES = [
    { hreflang: 'en', href: 'en' },
    { hreflang: 'x-default', href: 'x-default' },
];
