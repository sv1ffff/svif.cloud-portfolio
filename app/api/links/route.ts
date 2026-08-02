import { NextRequest, NextResponse } from "next/server";

import {
    createLink,
    deleteLink,
    isFirebaseConfigured,
    linkExists,
    listLinks,
    verifyIdToken,
} from "@/lib/firebase/admin";
import { isValidSlug, isValidUrl, normalizeUrl } from "@/lib/firebase/shortener";

/**
 * Two ways to authorize against the admin API:
 *   1. Shared secret: the "x-admin-key" header (set ADMIN_KEY in your env).
 *   2. Google sign-in: the "x-firebase-token" header with a Firebase ID token,
 *      whose email must be in ADMIN_EMAILS (comma-separated allowlist).
 */
async function isAuthorized(req: NextRequest): Promise<boolean> {
    const key = req.headers.get("x-admin-key");
    const expected = process.env.ADMIN_KEY;
    if (key && expected && key === expected) return true;

    const idToken = req.headers.get("x-firebase-token");
    if (!idToken) return false;

    const allowed = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

    if (allowed.length === 0) return false;

    try {
        const decoded = await verifyIdToken(idToken);
        return allowed.includes((decoded.email ?? "").toLowerCase());
    } catch {
        return false;
    }
}

function notConfigured() {
    return NextResponse.json(
        { error: "Firebase is not configured on the server (missing service-account env vars)." },
        { status: 500 }
    );
}

export async function GET(req: NextRequest) {
    if (!(await isAuthorized(req))) {
        return NextResponse.json({ error: "Unauthorized. Provide the admin key or sign in with Google." }, { status: 401 });
    }
    if (!isFirebaseConfigured()) return notConfigured();

    try {
        const links = await listLinks();
        return NextResponse.json({ links });
    } catch (err) {
        console.error("[links] GET failed:", err);
        return NextResponse.json({ error: "Failed to load links from the database." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!(await isAuthorized(req))) {
        return NextResponse.json({ error: "Unauthorized. Provide the admin key or sign in with Google." }, { status: 401 });
    }
    if (!isFirebaseConfigured()) return notConfigured();

    let body: { url?: string; slug?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const rawSlug = (body.slug ?? "").trim().toLowerCase();
    const rawUrl = (body.url ?? "").trim();

    if (!isValidSlug(rawSlug)) {
        return NextResponse.json(
            { error: "Invalid slug. Use letters, numbers, dashes or underscores (max 64 chars) and avoid reserved words." },
            { status: 400 }
        );
    }
    if (!isValidUrl(rawUrl)) {
        return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
    }

    try {
        if (await linkExists(rawSlug)) {
            return NextResponse.json({ error: `Slug "/${rawSlug}" is already taken.` }, { status: 409 });
        }
        const link = await createLink(rawSlug, normalizeUrl(rawUrl));
        return NextResponse.json({ link }, { status: 201 });
    } catch (err) {
        console.error("[links] POST failed:", err);
        return NextResponse.json({ error: "Failed to save the link to the database." }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!(await isAuthorized(req))) {
        return NextResponse.json({ error: "Unauthorized. Provide the admin key or sign in with Google." }, { status: 401 });
    }
    if (!isFirebaseConfigured()) return notConfigured();

    let body: { slug?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const slug = (body.slug ?? "").trim().toLowerCase();
    if (!isValidSlug(slug)) {
        return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
    }

    try {
        await deleteLink(slug);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[links] DELETE failed:", err);
        return NextResponse.json({ error: "Failed to delete the link." }, { status: 500 });
    }
}
