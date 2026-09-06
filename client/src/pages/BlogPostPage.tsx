import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { BLOG_POSTS } from '../content/blog';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) {
    return (
      <p className="py-12">
        Post not found. <Link to="/blog">Back to blog</Link>
      </p>
    );
  }
  return (
    <article className="mx-auto max-w-2xl py-8">
      <Seo title={post.title} description={post.excerpt} path={`/blog/${post.slug}`} />
      <p className="text-xs font-bold uppercase text-brand-700">{post.category}</p>
      <h1 className="mt-2 text-3xl font-extrabold">{post.title}</h1>
      <div className="mt-6 whitespace-pre-line text-stone-700 leading-relaxed">{post.body}</div>
      <Link to="/blog" className="mt-8 inline-block font-semibold text-brand-700">
        All posts
      </Link>
    </article>
  );
}
