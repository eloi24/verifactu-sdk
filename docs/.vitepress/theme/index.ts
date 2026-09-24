/**
 * Custom VitePress theme entry.
 *
 * Extends the default theme with a one-time redirect from the site root to
 * the visitor's browser language, falling back to Spanish when the browser
 * language isn't one of the mirrored locales.
 *
 * @module
 */

import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

/** Locales mirrored under `docs/`, matching {@link file://./../config.ts}. */
const SUPPORTED_LOCALES = ['en', 'es', 'ca', 'gl'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Locale used when the browser reports a language none of the mirrors cover. */
const FALLBACK_LOCALE: Locale = 'es';

/** sessionStorage key marking that the redirect already ran for this browsing session. */
const REDIRECT_FLAG = 'verifactu-docs-lang-redirected';

/**
 * Pick the best-matching supported locale for the visitor's browser.
 *
 * @returns The first of `navigator.languages` that matches a mirrored
 *   locale, or {@link FALLBACK_LOCALE} if none match.
 */
function preferredLocale(): Locale {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of languages) {
    const code = lang.slice(0, 2).toLowerCase();
    if ((SUPPORTED_LOCALES as readonly string[]).includes(code)) {
      return code as Locale;
    }
  }
  return FALLBACK_LOCALE;
}

/**
 * Redirect a fresh visit to the site root toward the visitor's preferred
 * locale. No-op on deep links (only the root is redirected) and on repeat
 * visits within the same session (once redirected, further root visits are
 * assumed intentional).
 */
function redirectToPreferredLocale(): void {
  if (typeof window === 'undefined') return;
  const base = import.meta.env.BASE_URL;
  if (window.location.pathname !== base) return;

  try {
    if (sessionStorage.getItem(REDIRECT_FLAG)) return;
    sessionStorage.setItem(REDIRECT_FLAG, '1');
  } catch {
    // ponytail: storage unavailable (private browsing) — redirect on every load instead of once.
  }

  const locale = preferredLocale();
  if (locale === 'en') return; // English is already served at the root.
  window.location.replace(`${base}${locale}/`);
}

export default {
  extends: DefaultTheme,
  enhanceApp() {
    redirectToPreferredLocale();
  },
} satisfies Theme;
