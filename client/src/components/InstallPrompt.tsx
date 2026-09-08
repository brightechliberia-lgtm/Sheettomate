import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [event, setEvent] = useState<{ prompt: () => Promise<void> } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!event) return null;
  return (
    <button
      type="button"
      className="text-xs font-semibold rounded-full bg-brand-600 px-3 py-1 text-white"
      onClick={() => void event.prompt().then(() => setEvent(null))}
    >
      Install app
    </button>
  );
}
