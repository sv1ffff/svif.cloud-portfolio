"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowUpRight,
    Check,
    Chrome,
    Copy,
    ExternalLink,
    Eye,
    KeyRound,
    Link2,
    Loader2,
    Lock,
    Plus,
    Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { isFirebaseClientConfigured, signInWithGoogle } from "@/lib/firebase/client";

interface ShortLink {
    slug: string;
    url: string;
    createdAt: number;
    updatedAt: number;
    visits: number;
}

const KEY_STORAGE = "svif_admin_key";
const TOKEN_STORAGE = "svif_firebase_token";

export default function AdminPage() {
    const [key, setKey] = useState<string>("");
    const [authed, setAuthed] = useState<boolean>(false);
    const [checking, setChecking] = useState<boolean>(false);
    const [googleChecking, setGoogleChecking] = useState<boolean>(false);

    const keyRef = useRef<string>("");
    const tokenRef = useRef<string>("");

    useEffect(() => {
        keyRef.current = key;
    }, [key]);

    const [url, setUrl] = useState<string>("");
    const [slug, setSlug] = useState<string>("");
    const [saving, setSaving] = useState<boolean>(false);

    const [links, setLinks] = useState<ShortLink[]>([]);
    const [loadingLinks, setLoadingLinks] = useState<boolean>(false);

    const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

    const call = useCallback(
        async (path: string, init?: RequestInit) => {
            const headers = new Headers(init?.headers);
            headers.set("x-admin-key", keyRef.current);
            if (tokenRef.current) headers.set("x-firebase-token", tokenRef.current);
            if (init?.body) headers.set("Content-Type", "application/json");
            const res = await fetch(path, { ...init, headers });
            let data: { error?: string; links?: ShortLink[]; link?: ShortLink; ok?: boolean } | null = null;
            try {
                data = await res.json();
            } catch {
                /* empty body */
            }
            return { res, data };
        },
        []
    );

    const loadLinks = useCallback(async () => {
        setLoadingLinks(true);
        setMessage(null);
        try {
            const { res, data } = await call("/api/links");
            if (res.ok) {
                setLinks(data?.links ?? []);
            } else {
                setMessage({ type: "err", text: data?.error ?? "Failed to load links." });
            }
        } catch {
            setMessage({ type: "err", text: "Network error while loading links." });
        } finally {
            setLoadingLinks(false);
        }
    }, [call]);

    useEffect(() => {
        const storedKey = sessionStorage.getItem(KEY_STORAGE);
        const storedToken = sessionStorage.getItem(TOKEN_STORAGE);
        if (storedKey || storedToken) {
            keyRef.current = storedKey ?? "";
            tokenRef.current = storedToken ?? "";
            setKey(storedKey ?? "");
            setAuthed(true);
            loadLinks();
        }
    }, [loadLinks]);

    const unlock = async () => {
        keyRef.current = key;
        setChecking(true);
        setMessage(null);
        try {
            const { res, data } = await call("/api/links");
            if (res.ok) {
                sessionStorage.setItem(KEY_STORAGE, key);
                setAuthed(true);
                setLinks(data?.links ?? []);
            } else {
                setMessage({ type: "err", text: data?.error ?? "Wrong admin key." });
            }
        } catch {
            setMessage({ type: "err", text: "Network error. Is the server running?" });
        } finally {
            setChecking(false);
        }
    };

    const unlockWithGoogle = async () => {
        if (!isFirebaseClientConfigured()) {
            setMessage({ type: "err", text: "Firebase web config is missing (NEXT_PUBLIC_FIREBASE_* env vars)." });
            return;
        }
        setGoogleChecking(true);
        setMessage(null);
        try {
            const idToken = await signInWithGoogle();
            tokenRef.current = idToken;
            const { res, data } = await call("/api/links");
            if (res.ok) {
                sessionStorage.setItem(TOKEN_STORAGE, idToken);
                setAuthed(true);
                setLinks(data?.links ?? []);
            } else {
                tokenRef.current = "";
                setMessage({ type: "err", text: data?.error ?? "This Google account is not authorized." });
            }
        } catch (err) {
            const code = (err as { code?: string })?.code ?? "";
            if (code === "auth/operation-not-allowed" || code === "auth/unauthorized-domain") {
                setMessage({
                    type: "err",
                    text: "Google sign-in isn't ready yet: enable the \"Google\" provider in Firebase → Authentication → Sign-in method.",
                });
            } else if (code === "auth/popup-closed-by-user") {
                setMessage(null);
            } else {
                setMessage({ type: "err", text: "Google sign-in failed." });
            }
        } finally {
            setGoogleChecking(false);
        }
    };

    const saveLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!slug.trim() || !url.trim()) {
            setMessage({ type: "err", text: "Both the URL and the slug are required." });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const { res, data } = await call("/api/links", {
                method: "POST",
                body: JSON.stringify({ url: url.trim(), slug: slug.trim() }),
            });
            if (res.ok) {
                setMessage({ type: "ok", text: `Saved! Short link is ready: /${data?.link?.slug ?? slug.trim()}` });
                setSlug("");
                setUrl("");
                await loadLinks();
            } else {
                setMessage({ type: "err", text: data?.error ?? "Failed to save the link." });
            }
        } catch {
            setMessage({ type: "err", text: "Network error while saving." });
        } finally {
            setSaving(false);
        }
    };

    const removeLink = async (link: ShortLink) => {
        if (!confirm(`Delete /${link.slug} ?`)) return;
        const { res, data } = await call("/api/links", {
            method: "DELETE",
            body: JSON.stringify({ slug: link.slug }),
        });
        if (res.ok) {
            setLinks((prev) => prev.filter((l) => l.slug !== link.slug));
            setMessage({ type: "ok", text: `Deleted /${link.slug}` });
        } else {
            setMessage({ type: "err", text: data?.error ?? "Failed to delete." });
        }
    };

    const copyLink = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(`${origin}/${slug}`);
            setCopied(slug);
            setTimeout(() => setCopied(null), 1500);
        } catch {
            /* clipboard blocked */
        }
    };

    if (!authed) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background px-container">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex flex-col items-center gap-4 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-secondary/50">
                            <Lock className="h-6 w-6 text-foreground" />
                        </div>
                        <div>
                            <h1 className="title text-2xl">Admin Panel</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Enter the admin key to manage short links.
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            unlock();
                        }}
                        className="flex flex-col gap-3"
                    >
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="password"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="Admin key"
                                autoFocus
                                className="w-full rounded-full border border-border/50 bg-background py-3.5 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={checking || !key}
                            className="flex h-12 items-center justify-center gap-2 rounded-full border border-border/50 bg-foreground text-background text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
                            {checking ? "Checking..." : "Unlock"}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 py-1">
                        <span className="h-px flex-1 bg-border/60" />
                        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">or</span>
                        <span className="h-px flex-1 bg-border/60" />
                    </div>

                    <button
                        onClick={unlockWithGoogle}
                        disabled={googleChecking}
                        className="flex h-12 items-center justify-center gap-2 rounded-full border border-border/50 bg-background text-foreground text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {googleChecking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Chrome className="h-4 w-4" />
                        )}
                        {googleChecking ? "Signing in..." : "Sign in with Google"}
                    </button>

                    {message && <MessageBox message={message} />}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background px-container py-12 md:py-20">
            <div className="mx-auto w-full max-w-4xl">
                <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <span className="title-counter">[admin]</span>
                        <h1 className="title mt-2 text-3xl sm:text-4xl">URL Shortener</h1>
                        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                            Create a short link, save it to Firestore, and it works instantly on
                            every domain pointing to this app: <span className="font-mono text-foreground">{origin}/v1</span>
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem(KEY_STORAGE);
                            sessionStorage.removeItem(TOKEN_STORAGE);
                            keyRef.current = "";
                            tokenRef.current = "";
                            setAuthed(false);
                        }}
                        className="self-start rounded-full border border-border/50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Lock
                    </button>
                </header>

                <form
                    onSubmit={saveLink}
                    className="mb-10 rounded-3xl border border-border/50 bg-secondary/20 p-5 backdrop-blur-sm sm:p-6"
                >
                    <div className="flex flex-col gap-4 md:flex-row md:items-end">
                        <div className="flex flex-1 flex-col gap-2">
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                Original URL
                            </label>
                            <div className="relative">
                                <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com/very/long/link"
                                    className="w-full rounded-full border border-border/50 bg-background py-3.5 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 md:w-56">
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                Short slug
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="pl-1 font-mono text-sm text-muted-foreground">/</span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                                    placeholder="v1"
                                    className="w-full flex-1 rounded-full border border-border/50 bg-background py-3.5 pl-2 pr-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="flex h-12 items-center justify-center gap-2 rounded-full border border-border/50 bg-foreground px-6 text-xs font-bold uppercase tracking-[0.2em] text-background transition-all duration-300 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>

                    {slug && url && (
                        <p className="mt-4 font-mono text-xs text-muted-foreground">
                            Preview: <span className="text-foreground">{origin}/{slug || "…"}</span>{" "}
                            → <span className="break-all">{url}</span>
                        </p>
                    )}
                </form>

                {message && <MessageBox message={message} />}

                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="title-counter">Saved links ({links.length})</h2>
                        <button
                            onClick={loadLinks}
                            disabled={loadingLinks}
                            className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                        >
                            {loadingLinks && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Refresh
                        </button>
                    </div>

                    {loadingLinks ? (
                        <div className="flex items-center justify-center gap-3 rounded-2xl border border-border/50 py-16 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading links…
                        </div>
                    ) : links.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
                            No short links yet. Create your first one above.
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {links.map((link) => (
                                <li
                                    key={link.slug}
                                    className="group flex flex-col gap-3 rounded-2xl border border-border/50 bg-secondary/10 p-4 transition-colors hover:border-foreground/30 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`/${link.slug}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-mono text-sm font-bold text-foreground underline-offset-4 hover:underline"
                                            >
                                                /{link.slug}
                                            </a>
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Eye className="h-3 w-3" /> {link.visits}
                                            </span>
                                        </div>
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1 truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            <span className="truncate">{link.url}</span>
                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                        </a>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <button
                                            onClick={() => copyLink(link.slug)}
                                            className="flex h-9 items-center gap-1.5 rounded-full border border-border/50 px-3 text-xs text-muted-foreground transition-all hover:border-foreground/40 hover:text-foreground"
                                        >
                                            {copied === link.slug ? (
                                                <Check className="h-3.5 w-3.5 text-green-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                            {copied === link.slug ? "Copied" : "Copy"}
                                        </button>
                                        <a
                                            href={`/${link.slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all hover:border-foreground/40 hover:text-foreground"
                                            aria-label="Open short link"
                                        >
                                            <ArrowUpRight className="h-4 w-4" />
                                        </a>
                                        <button
                                            onClick={() => removeLink(link)}
                                            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all hover:border-red-500/50 hover:text-red-500"
                                            aria-label="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}

function MessageBox({ message }: { message: { type: "ok" | "err"; text: string } }) {
    return (
        <div
            className={cn(
                "mb-6 mt-4 rounded-2xl border px-4 py-3 text-sm",
                message.type === "ok"
                    ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                    : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
            )}
        >
            {message.text}
        </div>
    );
}
