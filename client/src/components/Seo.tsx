import { useEffect } from 'react';

export default function Seo({
  title,
  description,
  path = '/',
  jsonLd,
}: {
  title: string;
  description: string;
  path?: string;
  jsonLd?: Record<string, unknown>;
}) {
  const url = `https://sheettomate.com${path}`;
  const full = `${title} · Sheettomate`;

  useEffect(() => {
    document.title = full;
    const tags: [string, string, string][] = [
      ['name', 'description', description],
      ['property', 'og:title', full],
      ['property', 'og:description', description],
      ['property', 'og:type', 'website'],
      ['property', 'og:url', url],
      ['property', 'og:image', 'https://sheettomate.com/og.svg'],
      ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'twitter:title', full],
      ['name', 'twitter:description', description],
    ];
    for (const [attr, key, content] of tags) {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    }
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    const scriptId = 'sheettomate-jsonld';
    const serialized = jsonLd ? JSON.stringify(jsonLd) : '';
    if (serialized) {
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.text = serialized;
    }
  }, [full, description, url, jsonLd]);

  return null;
}
