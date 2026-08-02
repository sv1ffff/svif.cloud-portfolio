import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

import { LINKS_NODE, type ShortLink } from "./shortener";

/**
 * Firebase Admin SDK binding (Node.js runtime only).
 *
 * All reads/writes to Realtime Database go through this module, so the
 * browser never touches the database directly and the security rules can
 * stay locked down.
 *
 * Required env vars (see .env.example):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_DATABASE_URL
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */

export function isFirebaseConfigured(): boolean {
    return Boolean(
        process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_DATABASE_URL &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY
    );
}

function getAdminApp() {
    if (getApps().length > 0) return getApps()[0];

    if (!isFirebaseConfigured()) {
        throw new Error(
            "Firebase is not configured. Add FIREBASE_PROJECT_ID, FIREBASE_DATABASE_URL, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to your environment (see .env.example)."
        );
    }

    return initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY as string).replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
}

function db() {
    return getDatabase(getAdminApp());
}

function linkRef(slug: string) {
    return db().ref(`${LINKS_NODE}/${slug}`);
}

/**
 * Fast lookup by slug. RTDB reads are path-based, so this only fetches the
 * data of that one child — this is what powers the instant redirects.
 */
export async function getLinkBySlug(slug: string): Promise<ShortLink | null> {
    const snap = await linkRef(slug).get();
    if (!snap.exists()) return null;
    return snap.val() as ShortLink;
}

export async function createLink(slug: string, url: string): Promise<ShortLink> {
    const link: ShortLink = {
        slug,
        url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        visits: 0,
    };
    await linkRef(slug).set(link);
    return link;
}

export async function linkExists(slug: string): Promise<boolean> {
    const snap = await linkRef(slug).get();
    return snap.exists();
}

export async function listLinks(limit = 200): Promise<ShortLink[]> {
    const snap = await db().ref(LINKS_NODE).get();
    const links: ShortLink[] = [];
    snap.forEach((child) => {
        links.push(child.val());
    });
    links.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)); // newest first
    return links.slice(0, limit);
}

export async function deleteLink(slug: string): Promise<boolean> {
    await linkRef(slug).remove();
    return true;
}

/**
 * Verifies a Firebase ID token (from a client-side Google sign-in).
 * Throws if the token is invalid/expired.
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email ?? undefined };
}
