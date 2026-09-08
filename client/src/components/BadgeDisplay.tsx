export default function BadgeDisplay({ badges }: { badges: { badge: string }[] }) {
  if (!badges.length) return <p className="text-sm text-stone-500">No badges yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <li key={b.badge} className="rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
          {b.badge}
        </li>
      ))}
    </ul>
  );
}
