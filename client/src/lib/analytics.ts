/* Lightweight analytics wrapper: GA4 (gtag) + optional PostHog.
   Controlled via Vite env vars:
   - VITE_GA_MEASUREMENT_ID
   - VITE_POSTHOG_KEY
   - VITE_POSTHOG_API_HOST (optional, defaults to https://app.posthog.com)

   No external dependencies required; scripts are injected at runtime.
*/

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_API_HOST as string) || "https://app.posthog.com";

function loadGtag(id: string) {
  if (typeof window === "undefined") return;
  if ((window as any).gtag) return;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);

  (window as unknown as { dataLayer?: unknown[] }).dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer || [];
  type GtagFn = (...args: unknown[]) => void;
  const gtag: GtagFn = (...args: unknown[]) => {
    const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer!;
    dl.push(args);
  };
  (window as unknown as { gtag?: GtagFn }).gtag = gtag;
  (window as unknown as any).gtag!("js", new Date());
  (window as unknown as any).gtag!("config", id, { send_page_view: false });
}

async function loadPostHog(key: string, host: string) {
  if (typeof window === "undefined") return;
  if ((window as any).posthog) return;

  try {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://unpkg.com/posthog-js/dist/posthog.min.js";
    document.head.appendChild(script);

    script.onload = () => {
      try {
          const ph = (window as unknown as { posthog?: { init?: (k: string, o?: Record<string, unknown>) => void } }).posthog;
          if (ph && typeof ph.init === "function") {
            ph.init(key, { api_host: host });
          }
        } catch (e) {
          // ignore
        }
    };
  } catch (e) {
    // ignore
  }
}

export function initAnalytics() {
  if (GA_ID) {
    loadGtag(GA_ID);
  }

  if (POSTHOG_KEY) {
    loadPostHog(POSTHOG_KEY, POSTHOG_HOST);
  }
}

export function pageview(path = window.location.pathname) {
    try {
    const maybeGtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (GA_ID && maybeGtag) {
      maybeGtag("event", "page_view", { page_path: path });
    }
    const maybePh = (window as unknown as { posthog?: { capture?: (n: string, p?: Record<string, unknown>) => void } }).posthog;
    if (POSTHOG_KEY && maybePh && typeof maybePh.capture === 'function') {
      maybePh.capture("pageview", { path });
    }
  } catch (e) {
    // swallow
  }
}

export function trackEvent(name: string, props: Record<string, unknown> = {}) {
  try {
    const maybeGtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (GA_ID && maybeGtag) {
      maybeGtag("event", name, props);
    }
    const maybePh = (window as unknown as { posthog?: { capture?: (n: string, p?: Record<string, unknown>) => void } }).posthog;
    if (POSTHOG_KEY && maybePh && typeof maybePh.capture === 'function') {
      maybePh.capture(name, props);
    }
  } catch (e) {
    // swallow
  }
}

export function identify(userId: string | null, traits: Record<string, unknown> = {}) {
  try {
    if (!userId) return;
    const maybePh = (window as unknown as { posthog?: { identify?: (id: string) => void; people?: { set?: (t: Record<string, unknown>) => void } } }).posthog;
    if (POSTHOG_KEY && maybePh && typeof maybePh.identify === 'function') {
      maybePh.identify(userId);
      maybePh.people && typeof maybePh.people.set === 'function' && maybePh.people.set!(traits as Record<string, unknown>);
    }
    // GA4: set user_id
    const maybeGtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (GA_ID && maybeGtag) {
      maybeGtag("set", { user_id: userId });
    }
  } catch (e) {
    // swallow
  }
}

export default { initAnalytics, pageview, trackEvent, identify };
