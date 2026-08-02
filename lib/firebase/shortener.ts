/**
 * Shared constants + validators for the URL Shortener & Redirect System.
 * This file is safe to import from both server and client code.
 */

/** Realtime Database node that stores the short links. Each child key = the slug (e.g. "v1"). */
export const LINKS_NODE = "links";

/** Slugs that would collide with real routes or locales are rejected at creation time. */
export const RESERVED_SLUGS = new Set([
    "en",
    "tr",
    "admin",
    "api",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
    "manifest.json",
    "manifest.webmanifest",
    "logo.png",
]);

/** A slug is a single URL segment: letters, numbers, dash and underscore. */
export const SLUG_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidSlug(slug: string): boolean {
    if (!SLUG_REGEX.test(slug)) return false;
    return !RESERVED_SLUGS.has(slug.toLowerCase());
}

/** Adds "https://" automatically when the user pastes a URL without a protocol. */
export function normalizeUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return "";
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

export function isValidUrl(input: string): boolean {
    try {
        const url = new URL(normalizeUrl(input));
        return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
    } catch {
        return false;
    }
}

export interface ShortLink {
    slug: string;
    url: string;
    createdAt: number;
    updatedAt: number;
    visits: number;
}
