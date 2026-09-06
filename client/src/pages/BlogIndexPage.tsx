import { Link } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import MarketingHero from '../components/MarketingHero';
import { ContentSection, LandingPageRoot, RevealGrid, SectionHeading } from '../components/landing/LandingUI';
import { Reveal } from '../components/landing/Reveal';
import Seo from '../components/Seo';
import { BLOG_POSTS } from '../content/blog';

const FEATURED_IMAGES = [
  'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=450&fit=crop&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=260&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488524719130-59e028a8cfe4?w=400&h=260&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=260&fit=crop&q=80',
];

export default function BlogIndexPage() {
  const [featured, ...rest] = BLOG_POSTS;

  return (
    <LandingPageRoot>
      <Seo title="Blog" description="Guides on spreadsheets, automation, and digital skills in Liberia." path="/blog" />
      <MarketingHero
        eyebrow="Resources"
        title="Blog & guides"
        subtitle="Tips for traders, NGO finance desks, and anyone learning Excel in Liberia."
        variant="mint"
      />

      {featured && (
        <ContentSection tone="white" className="py-10 sm:py-12 px-4 sm:px-6">
          <div className="landing-container">
            <Reveal>
              <Link
                to={`/blog/${featured.slug}`}
                className="group grid md:grid-cols-2 gap-0 rounded-3xl border border-stone-200/80 bg-white overflow-hidden hover:shadow-2xl motion-safe:transition-all duration-300"
              >
                <div className="relative overflow-hidden min-h-[220px]">
                  <LazyImage src={FEATURED_IMAGES[0]} alt="" className="h-full w-full object-cover group-hover:scale-105 motion-safe:transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-900/40 to-transparent md:hidden" />
                </div>
                <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent-600">Featured</p>
                  <p className="text-xs font-bold uppercase text-brand-700 mt-1">{featured.category}</p>
                  <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold group-hover:text-brand-700 motion-safe:transition">{featured.title}</h2>
                  <p className="mt-4 text-stone-600 leading-relaxed">{featured.excerpt}</p>
                  <span className="mt-5 text-sm font-semibold text-brand-700">Read article →</span>
                </div>
              </Link>
            </Reveal>
          </div>
        </ContentSection>
      )}

      <ContentSection tone="slate" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="Latest posts" subtitle="Practical spreadsheet skills for West Africa." />
          <RevealGrid className="mt-10 sm:mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6" stagger={100}>
            {rest.map((p, i) => (
              <Link
                key={p.slug}
                to={`/blog/${p.slug}`}
                className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-white hover:shadow-xl hover:border-accent-300 motion-safe:transition-all duration-300 h-full"
              >
                <div className="relative overflow-hidden">
                  <LazyImage src={FEATURED_IMAGES[(i + 1) % FEATURED_IMAGES.length]} alt="" className="h-40 w-full object-cover group-hover:scale-105 motion-safe:transition duration-500" />
                  <div className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur px-2.5 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                    {p.category}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display font-bold text-lg group-hover:text-brand-700 motion-safe:transition">{p.title}</h3>
                  <p className="mt-2 text-sm text-stone-600 line-clamp-2">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </RevealGrid>
        </div>
      </ContentSection>
    </LandingPageRoot>
  );
}
