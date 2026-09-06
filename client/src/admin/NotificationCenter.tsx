import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function NotificationCenter() {
  const [n, setN] = useState(0);
  useEffect(() => {
    api<{ unread: number }>('/courses/notifications')
      .then((d) => setN(d.unread))
      .catch(() => setN(0));
  }, []);
  return <span className="text-sm text-stone-600">Alerts {n ? `(${n})` : ''}</span>;
}
