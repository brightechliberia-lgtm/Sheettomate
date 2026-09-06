import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import UserProfile from '../components/UserProfile';

export default function PublicProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState<Parameters<typeof UserProfile>[0]['data'] | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    api<NonNullable<typeof data>>(`/community/users/${id}`)
      .then(setData)
      .catch(() => setData(null));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <p>Profile not found.</p>;
  return <UserProfile data={data} onChange={load} />;
}
