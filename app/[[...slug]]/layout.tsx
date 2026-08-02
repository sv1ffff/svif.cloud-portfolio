import { notFound, redirect } from "next/navigation";
import SmoothScroll from "@/providers/smooth-scroll-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { Preloader } from "@/components/layout/preloader";
import { CustomCursor } from "@/components/layout/custom-cursor";
import Navbar from "@/components/layout/navbar";
import { isValidLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { getDictionary, getContents, getSharedData } from "@/lib/loaders";
import { getLinkBySlug } from "@/lib/firebase/admin";

/**
 * Main site shell. Handles three kinds of URL:
 *   /            -> portfolio (default locale)
 *   /en, /tr     -> portfolio in that locale
 *   /<slug>      -> short link -> server-side redirect (e.g. /v1)
 *                  runs before the shell renders, so redirects stay fast.
 * Anything deeper than one segment is a 404.
 */
export function generateStaticParams() {
  return [{ slug: [] }, { slug: ["en"] }, { slug: ["tr"] }];
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const segments = Array.isArray(slug) ? slug : [];

  if (segments.length >= 2) {
    notFound();
  }

  const first = segments[0];

  if (first && !isValidLocale(first)) {
    let target: string | null = null;
    try {
      const link = await getLinkBySlug(first);
      target = link?.url ?? null;
    } catch (err) {
      console.error("[redirect] Firebase lookup failed:", err);
    }
    if (!target) {
      notFound();
    }
    redirect(target);
  }

  const lang: Locale = first && isValidLocale(first) ? first : DEFAULT_LOCALE;

  const [dictionary, contents, shared] = await Promise.all([
    getDictionary(lang),
    getContents(lang),
    getSharedData(),
  ]);

  return (
    <LanguageProvider lang={lang} dictionary={dictionary} contents={contents} shared={shared}>
      <CustomCursor />
      <Preloader />
      <SmoothScroll>
        <Navbar />
        {children}
      </SmoothScroll>
    </LanguageProvider>
  );
}
