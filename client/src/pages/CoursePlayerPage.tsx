import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { cacheLesson } from '../lib/offline';
import QuizComponent from '../components/QuizComponent';

interface LessonRow {
  id: string;
  title: string;
  type: string;
  completed: boolean;
}

interface LessonDetail {
  id: string;
  title: string;
  type: string;
  content: string;
  embedUrl?: string | null;
  videoUrl?: string | null;
  videoProvider?: string | null;
  resources: { id: string; title: string; url: string }[];
  quiz?: { questions: { id: string; type: 'MC' | 'TF'; prompt: string; choices?: string[] }[] } | null;
  questions: {
    id: string;
    body: string;
    user: { name: string };
    answers: { id: string; body: string; user: { name: string } }[];
  }[];
}

export default function CoursePlayerPage() {
  const { id, lessonId } = useParams();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [ctx, setCtx] = useState<{
    lesson: LessonDetail;
    note: { body: string } | null;
    bookmarked: boolean;
    progress: { positionSec: number; completed: boolean } | null;
  } | null>(null);
  const [note, setNote] = useState('');
  const [percent, setPercent] = useState(0);

  async function loadProgress() {
    if (!id) return;
    const data = await api<{
      enrollment: { progress: number; lastLessonId?: string };
      lessons: LessonRow[];
    }>(`/courses/${id}/progress`);
    setLessons(data.lessons);
    setPercent(data.enrollment.progress);
    return data;
  }

  useEffect(() => {
    void (async () => {
      try {
        const data = await loadProgress();
        const target = lessonId || data?.enrollment.lastLessonId || data?.lessons[0]?.id;
        if (target && target !== lessonId) {
          navigate(`/courses/${id}/learn/${target}`, { replace: true });
        }
      } catch {
        navigate(`/courses/${id}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!lessonId) return;
    api<{
      lesson: LessonDetail;
      note: { body: string } | null;
      bookmarked: boolean;
      progress: { positionSec: number; completed: boolean } | null;
    }>(`/courses/lessons/${lessonId}`)
      .then((d) => {
        setCtx(d);
        setNote(d.note?.body ?? '');
        void cacheLesson(lessonId, d);
        void api('/community/heartbeat', { method: 'POST', body: JSON.stringify({ learn: true }) });
      })
      .catch(() => setCtx(null));
  }, [lessonId]);

  async function complete() {
    if (!lessonId) return;
    await api(`/courses/lessons/${lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ completed: true }),
    });
    await loadProgress();
  }

  async function saveNote(e: FormEvent) {
    e.preventDefault();
    if (!lessonId) return;
    await api(`/courses/lessons/${lessonId}/notes`, { method: 'PUT', body: JSON.stringify({ body: note }) });
  }

  const lesson = ctx?.lesson;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      <aside className="rounded-2xl border bg-white p-4 h-fit">
        <p className="text-xs font-semibold text-brand-700">{percent}% complete</p>
        <ul className="mt-3 space-y-1 text-sm">
          {lessons.map((row) => (
            <li key={row.id}>
              <Link
                to={`/courses/${id}/learn/${row.id}`}
                className={`block rounded px-2 py-1 ${row.id === lessonId ? 'bg-brand-50 font-semibold' : ''}`}
              >
                {row.completed ? '✓ ' : ''}
                {row.title}
              </Link>
            </li>
          ))}
        </ul>
        {percent >= 100 && (
          <Link to={`/courses/${id}/certificate`} className="mt-4 block text-sm font-semibold text-brand-700">
            Download certificate
          </Link>
        )}
      </aside>
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        {!lesson && <p>Select a lesson to continue.</p>}
        {lesson && (
          <>
            <div className="flex justify-between gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{lesson.title}</h1>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-sm font-semibold text-brand-700"
                  onClick={() => {
                    if (!ctx) return;
                    void cacheLesson(lesson.id, ctx);
                  }}
                >
                  Save offline
                </button>
                <button
                  type="button"
                  className="text-sm"
                  onClick={() => void api(`/courses/lessons/${lesson.id}/bookmark`, { method: 'POST' })}
                >
                  {ctx?.bookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
              </div>
            </div>
            {lesson.type === 'VIDEO' && lesson.embedUrl && lesson.videoProvider === 'YOUTUBE' && (
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe title={lesson.title} src={lesson.embedUrl} className="h-full w-full" allowFullScreen />
              </div>
            )}
            {lesson.type === 'VIDEO' && lesson.videoProvider === 'VIMEO' && lesson.embedUrl && (
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe title={lesson.title} src={lesson.embedUrl} className="h-full w-full" allowFullScreen />
              </div>
            )}
            {lesson.type === 'VIDEO' && lesson.videoProvider === 'MUX' && lesson.videoUrl && (
              <video className="w-full rounded-xl" controls src={lesson.embedUrl ?? lesson.videoUrl} />
            )}
            {lesson.content && (
              <div className="prose max-w-none text-stone-800" dangerouslySetInnerHTML={{ __html: lesson.content }} />
            )}
            {lesson.resources?.map((r) => (
              <a key={r.id} href={r.url} className="block text-sm text-brand-700" target="_blank" rel="noreferrer">
                Resource: {r.title}
              </a>
            ))}
            {lesson.type === 'QUIZ' && lesson.quiz && (
              <QuizComponent lessonId={lesson.id} questions={lesson.quiz.questions} onPassed={() => void loadProgress()} />
            )}
            {(lesson.type === 'PROJECT' || lesson.type === 'PRACTICE') && (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  void api(`/courses/lessons/${lesson.id}/submit`, {
                    method: 'POST',
                    body: JSON.stringify({ notes: String(fd.get('notes')), fileUrl: String(fd.get('fileUrl') || '') }),
                  }).then(() => loadProgress());
                }}
              >
                <textarea name="notes" required minLength={4} placeholder="What did you complete?" className="w-full rounded border p-2 text-sm" />
                <input name="fileUrl" placeholder="Optional file URL" className="w-full rounded border p-2 text-sm" />
                <button type="submit" className="rounded bg-brand-600 px-3 py-1.5 text-white text-sm">
                  Submit work
                </button>
              </form>
            )}
            <button type="button" onClick={() => void complete()} className="rounded-lg border px-3 py-1.5 text-sm font-semibold">
              Mark complete
            </button>
            <form onSubmit={saveNote} className="space-y-2">
              <h2 className="font-semibold">Notes</h2>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded border p-2 text-sm min-h-24" />
              <button type="submit" className="text-sm font-semibold text-brand-700">
                Save notes
              </button>
            </form>
            <div>
              <h2 className="font-semibold">Q&A</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {lesson.questions?.map((q) => (
                  <li key={q.id}>
                    <p>
                      <strong>{q.user.name}:</strong> {q.body}
                    </p>
                    {q.answers.map((a) => (
                      <p key={a.id} className="ml-3 text-brand-800">
                        {a.user.name}: {a.body}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const body = String(new FormData(e.currentTarget).get('body'));
                  void api(`/courses/lessons/${lesson.id}/questions`, {
                    method: 'POST',
                    body: JSON.stringify({ body }),
                  }).then(() => {
                    e.currentTarget.reset();
                    if (lessonId) {
                      void api(`/courses/lessons/${lessonId}`).then((d) => setCtx(d as typeof ctx));
                    }
                  });
                }}
              >
                <input name="body" minLength={8} required placeholder="Ask a question" className="flex-1 rounded border px-2 py-1 text-sm" />
                <button type="submit" className="text-sm font-semibold">
                  Ask
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
