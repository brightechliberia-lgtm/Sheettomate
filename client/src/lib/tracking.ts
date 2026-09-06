export function initAnalytics() {
  const device = {
    ua: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    connection: (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection
      ?.effectiveType,
    saveData: (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };

  const ga = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (ga && typeof document !== 'undefined') {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${ga}`;
    document.head.appendChild(s);
    const inline = document.createElement('script');
    inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}',{custom_map:{dimension1:'os'}});`;
    document.head.appendChild(inline);
  }

  const sentry = import.meta.env.VITE_SENTRY_DSN;
  window.addEventListener('error', (event) => {
    if (sentry) {
      void fetch(sentry.replace(/\/$/, '') + '/api/store/', { method: 'POST', keepalive: true }).catch(() => undefined);
    }
    console.error('[sheettomate]', event.message, device);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[sheettomate:unhandled]', event.reason, device);
  });

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint' || entry.entryType === 'navigation') {
            console.debug('[perf]', entry.entryType, Math.round(entry.startTime));
          }
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      observer.observe({ type: 'navigation', buffered: true });
    } catch {
      /* unsupported */
    }
  }

  const ph = import.meta.env.VITE_POSTHOG_KEY;
  if (ph) {
    (window as unknown as { posthog?: { capture: (e: string, p?: object) => void } }).posthog = {
      capture: (event: string, properties?: object) => {
        void fetch('https://us.i.posthog.com/i/v0/e/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: ph,
            event,
            properties: { $lib: 'sheettomate-lite', ...device, ...properties },
          }),
        }).catch(() => undefined);
      },
    };
    (window as unknown as { posthog: { capture: (e: string) => void } }).posthog.capture('session_start');
  }
}
