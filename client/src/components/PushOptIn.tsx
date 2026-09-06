import { useEffect, useState } from 'react';
import { enablePush } from '../lib/push';

export default function PushOptIn() {
  const [ok, setOk] = useState('');
  useEffect(() => {
    if (Notification.permission === 'granted') setOk('Notifications on');
  }, []);
  return (
    <button
      type="button"
      className="text-xs font-semibold text-brand-700"
      onClick={() =>
        void enablePush()
          .then((v) => setOk(v ? 'Notifications on' : 'Could not enable'))
          .catch(() => setOk('Could not enable'))
      }
    >
      {ok || 'Enable alerts'}
    </button>
  );
}
