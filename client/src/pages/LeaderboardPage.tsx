import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import LeaderboardTable from '../components/LeaderboardTable';

export default function LeaderboardPage() {
  const [data, setData] = useState<{
    creators: { id: string; name: string; reputation: number; _count: { templates: number; followers: number } }[];
    mostHelpful: { id: string; name: string; helpful: number }[];
  } | null>(null);

  useEffect(() => {
    api<NonNullable<typeof data>>('/community/leaderboard').then(setData).catch(() => setData(null));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Leaderboards</h1>
      <LeaderboardTable
        title="Top creators"
        rows={(data?.creators ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          score: c.reputation,
          hint: `${c._count.templates} templates`,
        }))}
      />
      <LeaderboardTable
        title="Most helpful"
        rows={(data?.mostHelpful ?? []).map((c) => ({ id: c.id, name: c.name, score: c.helpful }))}
      />
      <p className="text-sm">
        Open a profile:{' '}
        {data?.creators[0] && (
          <Link to={`/u/${data.creators[0].id}`} className="text-brand-700 font-semibold">
            {data.creators[0].name}
          </Link>
        )}
      </p>
    </div>
  );
}
