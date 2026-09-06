import Seo from '../components/Seo';

export default function LegalPage({
  title,
  path,
  children,
}: {
  title: string;
  path: string;
  children: string;
}) {
  return (
    <article className="mx-auto max-w-2xl py-8">
      <Seo title={title} description={`${title} for Sheettomate.`} path={path} />
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <div className="mt-4 space-y-3 text-stone-700 text-sm whitespace-pre-line">{children}</div>
    </article>
  );
}
