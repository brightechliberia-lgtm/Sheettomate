import { api } from './api';

const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

/** Turn API-relative download paths into absolute URLs (avoids SPA white-page navigation). */
export function resolveDownloadUrl(downloadUrl: string): string {
  if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;
  let path = downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`;
  // Server historically returned `/api/templates/download/...` while VITE_API_URL already ends with `/api`.
  if (API_URL.endsWith('/api') && path.startsWith('/api/')) {
    path = path.slice(4);
  }
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Trigger a file download without replacing the current React page. */
export function startFileDownload(downloadUrl: string): void {
  const href = resolveDownloadUrl(downloadUrl);
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = href;
  document.body.appendChild(iframe);
  window.setTimeout(() => {
    iframe.remove();
  }, 60_000);
}

export async function downloadTemplateFile(templateId: string): Promise<void> {
  const data = await api<{ downloadUrl: string }>(`/templates/${templateId}/download`, { method: 'POST' });
  startFileDownload(data.downloadUrl);
}
