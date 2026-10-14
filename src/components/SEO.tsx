import { useEffect } from 'react';

/**
 * PageSEO — per-page SEO for public, indexable pages.
 * Sets document title, meta description, canonical URL, and Open Graph /
 * Twitter Card metadata. Drop-in component: render it at the top of any
 * public page. Portal, auth, and checkout pages must NOT use it.
 */

export const SITE_URL = 'https://muncheez.co.ke';

const DEFAULT_TITLE = 'Muncheez | Food, Grocery & Pharmacy Delivery in Nairobi';
const DEFAULT_DESCRIPTION =
    'Premium delivery from restaurants, supermarkets, and pharmacies across Nairobi. Browse local businesses, order simply, and get it delivered fast.';

interface PageSEOProps {
    /** Page-specific title, e.g. "Our Story". Rendered as "Our Story | Muncheez". */
    title: string;
    description: string;
    /** URL path including leading slash, e.g. "/company/story". */
    path: string;
    type?: 'website' | 'article';
}

export default function PageSEO({ title, description, path, type = 'website' }: PageSEOProps) {
    useEffect(() => {
        const fullTitle = `${title} | Muncheez`;
        const url = `${SITE_URL}${path}`;

        document.title = fullTitle;

        const setMeta = (name: string, content: string, isProperty = false) => {
            const attr = isProperty ? 'property' : 'name';
            let el = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, name);
                document.head.appendChild(el);
            }
            el.content = content;
        };

        setMeta('description', description);
        setMeta('og:title', title, true);
        setMeta('og:description', description, true);
        setMeta('og:type', type, true);
        setMeta('og:url', url, true);
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', title);
        setMeta('twitter:description', description);

        let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = url;

        return () => {
            document.title = DEFAULT_TITLE;
        };
    }, [title, description, path, type]);

    return null;
}
