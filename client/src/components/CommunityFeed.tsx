import { Link } from 'react-router-dom';

export default function CommunityFeed({
  items,
}: {
  items: { id: string; type: string; body: string; link?: string | null; createdAt: string; user?: { id: string; name: string } }[];
}) {
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id} className="rounded-xl border bg-white px-4 py-3 text-sm">
          <span className="font-semibold">{a.user?.name ?? 'Member'}</span> {a.body}{' '}
          {a.link && (
            <Link to={a.link} className="text-brand-700 font-semibold">
              View
            </Link>
          )}
        </li>
      ))}
      {items.length === 0 && <li className="text-stone-500 text-sm">Be the first to share something.</li>}
    </ul>
  );
}
