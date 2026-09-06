import { useLowData } from '../context/LowDataContext';

export default function OfflineBanner() {
  const { online, lowData, setLowData } = useLowData();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900 text-white text-xs px-4 py-2">
      <span>{online ? 'Online' : 'Offline — queued actions sync when you reconnect'}</span>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={lowData} onChange={(e) => setLowData(e.target.checked)} />
        Low data
      </label>
    </div>
  );
}
