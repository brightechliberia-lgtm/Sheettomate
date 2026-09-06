import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function VoteButtons({
  templateId,
  likeCount,
  liked,
}: {
  templateId: string;
  likeCount: number;
  liked?: boolean;
}) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(likeCount);
  const [isLiked, setLiked] = useState(Boolean(liked));
  const [totw, setTotw] = useState('');

  if (!user) return <p className="text-sm text-stone-500">{likes} likes</p>;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        type="button"
        className={`rounded-full border px-3 py-1 text-sm font-semibold ${isLiked ? 'bg-brand-50 text-brand-800' : ''}`}
        onClick={() =>
          void api<{ liked: boolean; likeCount: number }>(`/community/templates/${templateId}/like`, { method: 'POST' }).then((d) => {
            setLiked(d.liked);
            setLikes(d.likeCount);
          })
        }
      >
        ♥ {likes}
      </button>
      <button
        type="button"
        className="rounded-full border px-3 py-1 text-sm"
        onClick={() =>
          void api(`/community/templates/${templateId}/weekly-vote`, { method: 'POST' }).then(() => setTotw('Vote saved for Template of the Week'))
        }
      >
        Vote TOTW
      </button>
      {totw && <span className="text-xs text-brand-700">{totw}</span>}
    </div>
  );
}
