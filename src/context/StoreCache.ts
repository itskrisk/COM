/**
 * Lightweight in-memory store cache.
 * Lives for the duration of the browser session.
 * TTL: 5 minutes — stale data is re-fetched silently in the background.
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    fetchedAt: number;
}

class StoreCache {
    private storeMap = new Map<string, CacheEntry<any>>();
    private productsMap = new Map<string, CacheEntry<any[]>>();

    private isStale(entry: CacheEntry<any>): boolean {
        return Date.now() - entry.fetchedAt > TTL_MS;
    }

    // ── Store metadata ─────────────────────────────────────
    setStore(id: string, data: any) {
        this.storeMap.set(id, { data, fetchedAt: Date.now() });
    }

    getStore(id: string): any | null {
        const entry = this.storeMap.get(id);
        if (!entry) return null;
        return entry.data; // return even if stale — caller decides whether to refresh
    }

    isStoreStale(id: string): boolean {
        const entry = this.storeMap.get(id);
        return !entry || this.isStale(entry);
    }

    // ── Store products ─────────────────────────────────────
    setProducts(merchantId: string, data: any[]) {
        this.productsMap.set(merchantId, { data, fetchedAt: Date.now() });
    }

    getProducts(merchantId: string): any[] | null {
        const entry = this.productsMap.get(merchantId);
        if (!entry) return null;
        return entry.data;
    }

    isProductsStale(merchantId: string): boolean {
        const entry = this.productsMap.get(merchantId);
        return !entry || this.isStale(entry);
    }

    // ── Prefetch promise deduplication ────────────────────
    private inflight = new Map<string, Promise<void>>();

    async prefetch(id: string, fetchFn: () => Promise<void>) {
        // Already in-flight for this store — don't duplicate
        if (this.inflight.has(id)) return;
        // Already cached and fresh — no need to fetch
        if (!this.isStoreStale(id) && !this.isProductsStale(id)) return;

        const promise = fetchFn().finally(() => this.inflight.delete(id));
        this.inflight.set(id, promise);
        await promise;
    }
}

// Singleton — shared across the entire app session
export const storeCache = new StoreCache();
