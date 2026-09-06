import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { groupLessonsIntoModules } from '../lib/courseOutline';

interface Lesson {
  id: string;
  title: string;
  type: string;
  content?: string;
  videoUrl?: string | null;
  moduleTitle?: string | null;
  sortOrder?: number;
}

const LESSON_TYPES = ['TEXT', 'VIDEO', 'QUIZ', 'PRACTICE', 'PROJECT'] as const;

export default function CourseBuilderPage() {
  const { id } = useParams();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [title, setTitle] = useState('');
  const [objectives, setObjectives] = useState<string[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [moduleTitle, setModuleTitle] = useState('Module 1');
  const [panel, setPanel] = useState<'outline' | 'add' | 'outcomes' | 'import'>('outline');

  async function load() {
    if (!id) return;
    const data = await api<{ course: { title: string; objectives?: string[]; lessons: Lesson[] } }>(`/courses/${id}`);
    setTitle(data.course.title);
    setObjectives(data.course.objectives ?? []);
    setLessons(data.course.lessons);
  }

  useEffect(() => {
    load().catch((err: Error) => setMessage(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const modules = useMemo(() => groupLessonsIntoModules(lessons), [lessons]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    const fd = new FormData(e.currentTarget);
    const type = String(fd.get('type'));
    let quiz: unknown;
    if (type === 'QUIZ') {
      quiz = {
        passingScore: 70,
        questions: [
          {
            id: 'q1',
            type: 'MC',
            prompt: String(fd.get('qprompt') || 'Sample question'),
            choices: String(fd.get('qchoices') || 'A,B,C').split(','),
            correct: String(fd.get('qcorrect') || 'A'),
          },
        ],
      };
    }
    await api(`/courses/${id}/lessons`, {
      method: 'POST',
      body: JSON.stringify({
        title: fd.get('title'),
        moduleTitle: String(fd.get('moduleTitle') || moduleTitle),
        type,
        content: fd.get('content'),
        videoUrl: fd.get('videoUrl') || undefined,
        quiz,
        sortOrder: lessons.length,
      }),
    });
    e.currentTarget.reset();
    setPanel('outline');
    await load();
  }

  async function addStarterModule() {
    if (!id) return;
    const name = moduleTitle.trim() || `Module ${modules.length + 1}`;
    const starters = [
      {
        title: `${name} - Learning Outcomes`,
        type: 'TEXT',
        moduleTitle: name,
        content: `<h4>${name}</h4><p><strong>After completing this module, you will be able to:</strong></p><ul><li>Outcome one</li><li>Outcome two</li><li>Outcome three</li></ul>`,
      },
      {
        title: 'Core topic 1',
        type: 'TEXT',
        moduleTitle: name,
        content: '<p>Write your lesson content here.</p>',
      },
      {
        title: `${name} - Lesson Summary`,
        type: 'TEXT',
        moduleTitle: name,
        content: `<p><strong>Key points from ${name}:</strong></p><ul><li>Point one</li><li>Point two</li></ul>`,
      },
    ];
    await api(`/courses/${id}/lessons/import`, {
      method: 'POST',
      body: JSON.stringify({
        lessons: [...lessons.map((l) => ({ title: l.title, type: l.type, moduleTitle: l.moduleTitle, content: l.content })), ...starters],
      }),
    });
    setMessage(`Added starter structure for “${name}”.`);
    await load();
  }

  async function persistOrder(next: Lesson[]) {
    if (!id) return;
    setLessons(next);
    await api(`/courses/${id}/lessons/order`, {
      method: 'PUT',
      body: JSON.stringify({ ids: next.map((l) => l.id) }),
    });
  }

  function drop(index: number) {
    if (dragging === null || dragging === index) return;
    const next = [...lessons];
    const [moved] = next.splice(dragging, 1);
    next.splice(index, 0, moved);
    setDragging(null);
    void persistOrder(next);
  }

  async function saveObjectives(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    const raw = String(new FormData(e.currentTarget).get('objectives'));
    const list = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    await api(`/courses/${id}`, { method: 'PUT', body: JSON.stringify({ objectives: list }) });
    setObjectives(list);
    setMessage('Course learning outcomes saved.');
  }

  async function submitReview() {
    if (!id) return;
    await api(`/courses/${id}/submit`, { method: 'POST' });
    setMessage('Submitted for review.');
  }

  async function bulk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    const raw = String(new FormData(e.currentTarget).get('json'));
    const parsed = JSON.parse(raw) as { lessons: unknown[] };
    await api(`/courses/${id}/lessons/import`, { method: 'POST', body: JSON.stringify(parsed) });
    await load();
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-2xl border bg-gradient-to-r from-brand-800 to-brand-600 text-white p-6 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Course builder</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold">{title || 'Untitled course'}</h1>
        <p className="mt-2 text-white/80 text-sm">Structure modules with Learning Outcomes → core topics → Lesson Summary.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ['outline', 'Outline'],
              ['outcomes', 'Course outcomes'],
              ['add', 'Add topic'],
              ['import', 'Import JSON'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel(id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${panel === id ? 'bg-white text-brand-800' : 'bg-white/15 text-white'}`}
            >
              {label}
            </button>
          ))}
          <Link to={`/courses/${id}`} className="rounded-full px-4 py-1.5 text-sm font-semibold bg-gold text-white">
            Preview page
          </Link>
        </div>
      </header>

      {message && <p className="text-sm rounded-lg border border-brand-100 bg-brand-50 px-4 py-2 text-brand-800">{message}</p>}

      {panel === 'outline' && (
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="border-b bg-brand-50 px-5 py-3 flex justify-between items-center">
              <h2 className="font-bold text-brand-800">Modules & topics</h2>
              <span className="text-xs text-stone-500">{lessons.length} topics</span>
            </div>
            {modules.map((mod, mi) => (
              <div key={mod.title} className="border-b last:border-0">
                <div className="px-5 py-3 bg-stone-50 flex justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gold">Module {mi + 1}</p>
                    <p className="font-bold text-brand-800">{mod.title}</p>
                  </div>
                  <p className="text-xs text-stone-500 self-center">{mod.lessons.length} topics</p>
                </div>
                <ul className="divide-y">
                  {mod.lessons.map((lesson) => {
                    const globalIndex = lessons.findIndex((l) => l.id === lesson.id);
                    return (
                      <li
                        key={lesson.id}
                        draggable
                        onDragStart={() => setDragging(globalIndex)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => drop(globalIndex)}
                        className="px-5 py-3 flex justify-between gap-3 cursor-move hover:bg-brand-50/40"
                      >
                        <div>
                          <p className="font-medium text-sm">{lesson.title}</p>
                          <p className="text-xs text-stone-500">
                            {lesson.type}
                            {/learning outcomes/i.test(lesson.title) ? ' · Outcomes page' : ''}
                            {/summary/i.test(lesson.title) ? ' · Summary page' : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-red-600 shrink-0"
                          onClick={() => void api(`/courses/${id}/lessons/${lesson.id}`, { method: 'DELETE' }).then(load)}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {lessons.length === 0 && <p className="p-6 text-sm text-stone-500">No topics yet. Add a starter module on the right.</p>}
          </section>

          <aside className="rounded-2xl border bg-white p-5 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-brand-800">Quick add module</h3>
            <p className="text-xs text-stone-600">Creates Learning Outcomes, one core topic, and a Lesson Summary — ready to edit.</p>
            <input
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Module title"
            />
            <button type="button" onClick={() => void addStarterModule()} className="w-full rounded-full bg-brand-600 py-2 text-sm font-bold text-white">
              Insert module structure
            </button>
            <button type="button" onClick={() => void submitReview()} className="w-full rounded-full border py-2 text-sm font-semibold">
              Submit for review
            </button>
          </aside>
        </div>
      )}

      {panel === 'outcomes' && (
        <form onSubmit={saveObjectives} className="rounded-2xl border bg-white p-6 max-w-2xl shadow-sm space-y-3">
          <h2 className="text-xl font-extrabold text-brand-800">Course learning outcomes</h2>
          <p className="text-sm text-stone-600">Shown on the course page under “After completing this course, you will be able to:”</p>
          <textarea
            name="objectives"
            rows={8}
            defaultValue={objectives.join('\n')}
            placeholder={'Build a daily cash table\nUse SUM and IF\nPublish a simple dashboard'}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-full bg-brand-600 px-5 py-2 text-white font-bold text-sm">
            Save outcomes
          </button>
        </form>
      )}

      {panel === 'add' && (
        <form onSubmit={add} className="rounded-2xl border bg-white p-6 grid gap-3 max-w-xl shadow-sm">
          <h2 className="font-bold text-brand-800">Add topic</h2>
          <label className="text-sm font-medium">
            Module
            <input name="moduleTitle" defaultValue={moduleTitle} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <input name="title" required placeholder="Topic title (e.g. Module 1 - Learning Outcomes)" className="rounded-lg border px-3 py-2" />
          <select name="type" className="rounded-lg border px-3 py-2" defaultValue="TEXT">
            {LESSON_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input name="videoUrl" placeholder="YouTube, Vimeo, or Mux URL" className="rounded-lg border px-3 py-2" />
          <textarea name="content" placeholder="HTML or text content" className="rounded-lg border px-3 py-2 min-h-28" />
          <input name="qprompt" placeholder="Quiz prompt (if quiz)" className="rounded-lg border px-3 py-2" />
          <input name="qchoices" placeholder="Choices comma-separated" className="rounded-lg border px-3 py-2" />
          <input name="qcorrect" placeholder="Correct choice" className="rounded-lg border px-3 py-2" />
          <button type="submit" className="rounded-full bg-brand-600 py-2.5 text-white font-bold">
            Add topic
          </button>
        </form>
      )}

      {panel === 'import' && (
        <form onSubmit={bulk} className="rounded-2xl border bg-white p-6 max-w-xl space-y-2 shadow-sm">
          <h2 className="font-bold text-brand-800">Bulk import JSON</h2>
          <textarea
            name="json"
            className="w-full min-h-40 rounded border p-2 font-mono text-xs"
            defaultValue={`{"lessons":[{"title":"Module 1 - Learning Outcomes","moduleTitle":"Module 1","type":"TEXT","content":"<ul><li>Outcome</li></ul>"},{"title":"Core topic","moduleTitle":"Module 1","type":"TEXT","content":"<p>Hello</p>"},{"title":"Module 1 - Lesson Summary","moduleTitle":"Module 1","type":"TEXT","content":"<ul><li>Key point</li></ul>"}]}`}
          />
          <button type="submit" className="rounded-full bg-brand-600 px-5 py-2 text-white font-bold text-sm">
            Import
          </button>
        </form>
      )}
    </div>
  );
}
