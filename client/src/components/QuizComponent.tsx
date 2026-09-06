import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

interface Question {
  id: string;
  type: 'MC' | 'TF';
  prompt: string;
  choices?: string[];
}

export default function QuizComponent({
  lessonId,
  questions,
  onPassed,
}: {
  lessonId: string;
  questions: Question[];
  onPassed: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const data = await api<{ score: number; passed: boolean }>(`/courses/lessons/${lessonId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    setResult(data);
    if (data.passed) onPassed();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {questions.map((q) => (
        <fieldset key={q.id} className="rounded-lg border p-3">
          <legend className="font-medium">{q.prompt}</legend>
          {q.type === 'TF' ? (
            <div className="mt-2 flex gap-4 text-sm">
              {['true', 'false'].map((v) => (
                <label key={v}>
                  <input type="radio" name={q.id} onChange={() => setAnswers((a) => ({ ...a, [q.id]: v }))} /> {v}
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-2 space-y-1 text-sm">
              {(q.choices ?? []).map((c) => (
                <label key={c} className="block">
                  <input type="radio" name={q.id} onChange={() => setAnswers((a) => ({ ...a, [q.id]: c }))} /> {c}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
      <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-white font-semibold">
        Submit quiz
      </button>
      {result && (
        <p className={result.passed ? 'text-brand-700' : 'text-red-600'}>
          Score {result.score}% {result.passed ? '— passed' : '— try again (70% to pass)'}
        </p>
      )}
    </form>
  );
}
