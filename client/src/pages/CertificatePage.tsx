import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function CertificatePage() {
  const { id } = useParams();
  const [svg, setSvg] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api<{ svg: string; certificate: { code: string } }>(`/courses/${id}/certificate`)
      .then((d) => {
        setSvg(d.svg);
        setCode(d.certificate.code);
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  function download() {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${code || 'certificate'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!svg) return <p>Preparing certificate…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Certificate</h1>
      <div className="overflow-auto rounded-2xl border bg-white p-4" dangerouslySetInnerHTML={{ __html: svg }} />
      <button type="button" onClick={download} className="rounded-lg bg-brand-600 px-4 py-2 text-white font-semibold">
        Download SVG
      </button>
    </div>
  );
}
