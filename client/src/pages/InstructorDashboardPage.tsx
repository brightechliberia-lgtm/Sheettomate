import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useCatalog } from '../hooks/useCatalog';

interface CourseRow {
  id: string;
  title: string;
  students: number;
  completionRate: number;
  averageRating: number;
  revenueUsd: number;
}

export default function InstructorDashboardPage() {
  const navigate = useNavigate();
  const { catalog } = useCatalog();
  const [items, setItems] = useState<CourseRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ items: CourseRow[] }>('/courses/instructor/me')
      .then((d) => setItems(d.items))
      .catch((err: Error) => setError(err.message));
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = await api<{ course: { id: string } }>('/courses', {
      method: 'POST',
      body: JSON.stringify({
        title: fd.get('title'),
        description: fd.get('description'),
        category: fd.get('category') || undefined,
        level: fd.get('level'),
        price: Number(fd.get('price') || 0),
        objectives: String(fd.get('objectives') || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        prerequisites: fd.get('prerequisites'),
      }),
    });
    navigate(`/instructor/courses/${data.course.id}`);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Instructor studio</h1>
      {error && <p className="text-red-600">{error}</p>}
      <form onSubmit={create} className="rounded-2xl border bg-white p-6 grid gap-3 max-w-xl">
        <h2 className="font-bold">New course</h2>
        <input name="title" required minLength={3} placeholder="Title" className="rounded border px-3 py-2" />
        <textarea name="description" required minLength={10} placeholder="Description" className="rounded border px-3 py-2" />
        <select name="category" className="rounded border px-3 py-2" defaultValue={catalog.courseCategories[0] ?? ''}>
          {catalog.courseCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="level" className="rounded border px-3 py-2">
          <option>BEGINNER</option>
          <option>INTERMEDIATE</option>
          <option>ADVANCED</option>
        </select>
        <input name="price" type="number" min={0} step="0.01" defaultValue={0} className="rounded border px-3 py-2" />
        <textarea name="objectives" placeholder="One objective per line" className="rounded border px-3 py-2" />
        <input name="prerequisites" placeholder="Prerequisites" className="rounded border px-3 py-2" />
        <button type="submit" className="rounded-lg bg-brand-600 py-2 text-white font-semibold">
          Create draft
        </button>
      </form>
      <table className="w-full text-sm bg-white rounded-2xl border">
        <thead>
          <tr className="text-left border-b">
            <th className="p-3">Course</th>
            <th>Students</th>
            <th>Completion</th>
            <th>Rating</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-3">
                <Link className="font-semibold text-brand-700" to={`/instructor/courses/${row.id}`}>
                  {row.title}
                </Link>
              </td>
              <td>{row.students}</td>
              <td>{Math.round(row.completionRate * 100)}%</td>
              <td>{row.averageRating.toFixed(1)}</td>
              <td>${row.revenueUsd.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
