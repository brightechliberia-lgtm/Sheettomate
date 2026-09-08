import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import LazyImage from '../components/LazyImage';
import Seo from '../components/Seo';
import { groupLessonsIntoModules } from '../lib/courseOutline';

interface Lesson {
  id: string;
  title: string;
  type: string;
  sortOrder: number;
  moduleTitle?: string | null;
  durationSec?: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  price: string | number;
  promoPercent?: number;
  objectives: string[];
  prerequisites: string;
  thumbnailUrl?: string | null;
  instructor: { name: string };
  lessons: Lesson[];
  averageRating: number;
  ratingCount: number;
}

export default function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { formatUsd } = useCurrency();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<{ progress: number; lastLessonId?: string | null } | null>(null);
  const [message, setMessage] = useState('');
  const [openModule, setOpenModule] = useState<number | null>(0);
  const [tab, setTab] = useState<'outcomes' | 'modules' | 'about'>('outcomes');

  useEffect(() => {
    if (!id) return;
    api<{ course: Course; enrollment: typeof enrollment }>(`/courses/${id}`)
      .then((d) => {
        setCourse(d.course);
        setEnrollment(d.enrollment);
      })
      .catch((err: Error) => setMessage(err.message));
  }, [id]);

  const modules = useMemo(() => (course ? groupLessonsIntoModules(course.lessons) : []), [course]);

  async function enroll() {
    if (!course) return;
    try {
      const data = await api<{ requiresPayment?: boolean; courseId?: string }>(`/courses/${course.id}/enroll`, {
        method: 'POST',
      });
      if (data.requiresPayment) {
        navigate(`/checkout?courseId=${course.id}`);
        return;
      }
      navigate(`/courses/${course.id}/learn`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not enroll');
    }
  }

  if (!course) return <p className="p-8 text-stone-500">{message || 'Loading…'}</p>;
  const price = Number(course.price) * (1 - (course.promoPercent ?? 0) / 100);
  const minutes = Math.max(1, Math.round(course.lessons.reduce((n, l) => n + (l.durationSec ?? 0), 0) / 60) || course.lessons.length * 8);

  return (
    <div className="bg-gradient-to-b from-brand-50/80 via-white to-white min-h-full">
      <Seo title={course.title} description={course.description} path={`/courses/${course.id}`} />

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-brand-900" />
        <div className="absolute inset-0 bg-brand-800" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div className="text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{course.level} course</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{course.title}</h1>
            <p className="mt-4 text-white/80 text-lg max-w-xl">{course.description}</p>
            <p className="mt-4 text-sm text-white/70">
              By {course.instructor.name} · {course.lessons.length} topics · ~{minutes} min ·{' '}
              {course.averageRating ? `${course.averageRating.toFixed(1)}★ (${course.ratingCount})` : 'New'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {user && !enrollment && (
                <button type="button" onClick={() => void enroll()} className="rounded-full bg-brand-600 px-6 py-3 font-bold text-white shadow-lg">
                  Start learning — {price === 0 ? 'Free' : formatUsd(price)}
                </button>
              )}
              {enrollment && (
                <Link to={`/courses/${course.id}/learn`} className="rounded-full bg-brand-600 px-6 py-3 font-bold text-white shadow-lg">
                  Resume ({enrollment.progress}%)
                </Link>
              )}
              {!user && (
                <Link to="/login" className="rounded-full bg-brand-600 px-6 py-3 font-bold text-white shadow-lg">
                  Log in to start
                </Link>
              )}
              <button type="button" onClick={() => setTab('outcomes')} className="rounded-full border border-white/40 px-6 py-3 font-semibold text-white">
                View learning outcomes
              </button>
            </div>
            {message && <p className="mt-3 text-sm text-red-200">{message}</p>}
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white/5 aspect-video">
            <LazyImage
              src={
                course.thumbnailUrl ||
                'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=450&fit=crop&q=80'
              }
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap gap-2 -mt-5 relative z-10">
          {(
            [
              ['outcomes', 'Learning outcomes'],
              ['modules', 'Modules & topics'],
              ['about', 'About this course'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold shadow-md border ${
                tab === id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-brand-800 border-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 grid lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-6">
          {tab === 'outcomes' && (
            <section className="rounded-2xl border border-brand-100 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-extrabold text-brand-800">Learning outcomes</h2>
              <p className="mt-2 font-semibold text-stone-700">After completing this course, you will be able to:</p>
              <ul className="mt-5 space-y-3">
                {(course.objectives?.length ? course.objectives : ['Complete the lessons and practice tasks in this course']).map((o) => (
                  <li key={o} className="flex gap-3 text-stone-700">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">✓</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
              {modules.some((m) => m.outcomes.length) && (
                <div className="mt-8 space-y-4">
                  <h3 className="font-bold text-brand-800">Module learning outcomes</h3>
                  {modules.map((m) =>
                    m.outcomes.length ? (
                      <div key={m.title} className="rounded-xl border bg-brand-50/50 p-4">
                        <p className="font-semibold text-brand-800">{m.title}</p>
                        <ul className="mt-2 list-disc pl-5 text-sm text-stone-700 space-y-1">
                          {m.outcomes.map((l) => (
                            <li key={l.id}>
                              Open topic: <span className="font-medium">{l.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </section>
          )}

          {tab === 'modules' && (
            <section className="rounded-2xl border border-brand-100 bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-brand-50 px-6 py-4">
                <h2 className="text-xl font-extrabold text-brand-800">Course modules</h2>
                <p className="text-sm text-stone-600 mt-1">{modules.length} modules · {course.lessons.length} topics</p>
              </div>
              <div className="divide-y">
                {modules.map((mod, mi) => (
                  <div key={mod.title}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-brand-50/60"
                      onClick={() => setOpenModule(openModule === mi ? null : mi)}
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Module {mi + 1}</p>
                        <p className="font-bold text-brand-800">{mod.title}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{mod.lessons.length} topics</p>
                      </div>
                      <span className="text-brand-600 font-bold">{openModule === mi ? '−' : '+'}</span>
                    </button>
                    {openModule === mi && (
                      <ol className="px-6 pb-5 space-y-2">
                        {mod.lessons.map((l, li) => (
                          <li key={l.id} className="flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm">
                            <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-brand-100 text-brand-800 grid place-items-center text-xs font-bold">
                              {li + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-stone-800">{l.title}</p>
                              <p className="text-xs text-stone-500 mt-0.5">
                                {l.type}
                                {/learning outcomes/i.test(l.title) ? ' · Outcomes' : ''}
                                {/summary/i.test(l.title) ? ' · Summary' : ''}
                              </p>
                            </div>
                            {enrollment ? (
                              <Link to={`/courses/${course.id}/learn/${l.id}`} className="text-xs font-bold text-brand-700 shrink-0">
                                Open
                              </Link>
                            ) : (
                              <span className="text-xs text-stone-400 shrink-0">Locked</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
                {modules.length === 0 && <p className="p-6 text-stone-500 text-sm">No modules yet.</p>}
              </div>
            </section>
          )}

          {tab === 'about' && (
            <section className="rounded-2xl border bg-white p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-extrabold text-brand-800">About this course</h2>
              <p className="text-stone-700 leading-relaxed">{course.description}</p>
              <p className="text-sm text-stone-600">
                <strong>Prerequisites:</strong> {course.prerequisites || 'None'}
              </p>
              <p className="text-sm text-stone-600">
                <strong>Instructor:</strong> {course.instructor.name}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-4 h-fit lg:sticky lg:top-24">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-2xl font-extrabold text-brand-800">{price === 0 ? 'Free' : formatUsd(price)}</p>
            <ul className="mt-4 space-y-2 text-sm text-stone-600">
              <li>· {course.lessons.length} topics</li>
              <li>· {modules.length} modules</li>
              <li>· Certificate on completion</li>
              <li>· Learn on phone or laptop</li>
            </ul>
            {user && !enrollment && (
              <button type="button" onClick={() => void enroll()} className="mt-5 w-full rounded-full bg-brand-600 py-2.5 text-white font-bold">
                Enroll now
              </button>
            )}
            {enrollment && (
              <Link to={`/courses/${course.id}/learn`} className="mt-5 block text-center rounded-full bg-brand-600 py-2.5 text-white font-bold">
                Continue
              </Link>
            )}
            {!user && (
              <Link to="/login" className="mt-5 block text-center rounded-full bg-brand-600 py-2.5 text-white font-bold">
                Log in to enroll
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
