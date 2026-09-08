import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { type MarketplaceTemplate } from '@sheetomate/shared';
import { api } from '../lib/api';
import Seo from '../components/Seo';
import NewsletterForm from '../components/NewsletterForm';
import LazyImage from '../components/LazyImage';
import CategoryCard from '../components/CategoryCard';
import MarketingHero, { CatalogSearch } from '../components/MarketingHero';
import {
  ContentSection,
  CtaBand,
  FeatureCard,
  LandingPageRoot,
  PricingCard,
  RevealGrid,
  SectionHeading,
  StatBand,
  StepCard,
  TestimonialCard,
} from '../components/landing/LandingUI';
import { Reveal } from '../components/landing/Reveal';
import { BLOG_POSTS } from '../content/blog';
import { CATEGORY_CATALOG } from '../content/categories';
import type { CatalogCourse } from '../components/CourseCatalog';

const SEARCH_CHIPS = ['Cashbook', 'Inventory', 'Payroll', 'Grant tracker', 'Invoices', 'Budget'];

const STEPS = [
  { n: '01', title: 'Create a free account', body: 'Verify email and you are in.' },
  { n: '02', title: 'Search or describe', body: 'Browse templates or describe the file you need.' },
  { n: '03', title: 'Download your workbook', body: 'Excel or Google Sheets, paid with Orange Money or Visa when needed.' },
  { n: '04', title: 'Learn and automate', body: 'Course lessons plus workflows that keep the file alive.' },
];

const FAQS = [
  [
    'What is Sheettomate?',
    'Sheettomate is Liberia’s spreadsheet hub: get templates, build your own files, and learn — with Orange Money, Mobile Money, and Visa.',
  ],
  [
    'How do I build my own template?',
    'You describe the workbook in plain language. We generate a structured Excel file (and a preview). If no AI key is configured, ExcelJS still produces a usable template.',
  ],
  [
    'What payment methods are accepted?',
    'Orange Money, MTN Mobile Money, and Visa/Mastercard via BanffPay. Amounts can show in USD or LRD.',
  ],
  ['Can I sell my own templates?', 'Yes. Creator accounts upload templates and keep 70% of each sale on the Creator plan.'],
  [
    'Do I need prior spreadsheet experience?',
    'No. Start from marketplace files or beginner courses. The builder works if you only know the outcome you want.',
  ],
  [
    'Is my data secure?',
    'Accounts use hashed passwords, HTTP-only refresh cookies, and we never store card PAN/CVV. Downloads use short-lived tokens.',
  ],
];

const TESTIMONIALS = [
  {
    name: 'Amina Kollie',
    role: 'Shop owner, Duala Market',
    quote: 'I stopped mixing LRD and USD in one column. The cashbook paid for itself in a week.',
    img: 'https://i.pravatar.cc/160?img=47',
  },
  {
    name: 'James Weah',
    role: 'Finance officer, Monrovia NGO',
    quote: 'Grant burn-rate finally lives in one file my field team can update from phones.',
    img: 'https://i.pravatar.cc/160?img=12',
  },
  {
    name: 'Sia Johnson',
    role: 'Operations, FMCG distributor',
    quote: 'Stock tracker plus Institute lessons meant my clerks actually fill the sheet every evening.',
    img: 'https://i.pravatar.cc/160?img=32',
  },
];

const STATS = [
  { n: '1,000+', l: 'Professionals in Liberia' },
  { n: '10', l: 'Template categories' },
  { n: '3', l: 'Ways to pay locally' },
  { n: '70%', l: 'Kept by creators' },
];

type CatalogTab = 'popular' | 'institute' | 'newest';

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [newest, setNewest] = useState<MarketplaceTemplate[]>([]);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [tab, setTab] = useState<CatalogTab>('popular');
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api<{ items: MarketplaceTemplate[] }>('/templates?pageSize=8&sort=popular')
      .then((d) => setTemplates(d.items))
      .catch(() => setTemplates([]));
    api<{ items: MarketplaceTemplate[] }>('/templates?pageSize=8&sort=newest')
      .then((d) => setNewest(d.items))
      .catch(() => setNewest([]));
    api<{ items: CatalogCourse[] }>('/courses')
      .then((d) => setCourses(d.items.slice(0, 6)))
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    if (location.pathname === '/pricing' || location.hash === '#pricing') {
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname, location.hash]);

  const proPrice = yearly ? 23 : 29;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/get-templates?q=${encodeURIComponent(q)}` : '/get-templates');
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sheettomate',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description:
      'Liberia’s first AI-powered spreadsheet platform for Excel and Google Sheets templates, payments, and training.',
    areaServed: 'LR',
  };

  const catalogTemplates = tab === 'newest' ? newest : templates;

  return (
    <LandingPageRoot>
      <Seo
        title="Get templates, build your own & learn"
        description="Download spreadsheet templates, build any workbook you need, and learn Excel skills — built for Liberia and West Africa."
        path="/"
        jsonLd={jsonLd}
      />

      <MarketingHero
        eyebrow="Liberia & West Africa"
        title="Get templates. Build your own. Learn."
        subtitle="What do you want to work on today?"
        pillar="get"
        variant="mint"
      >
        <div className="w-full max-w-xl space-y-4">
          <CatalogSearch value={query} onChange={setQuery} onSubmit={onSearch} placeholder="Search cashbooks, inventory, grants…" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Popular searches</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="rounded-full border border-stone-200 bg-white/80 backdrop-blur px-3 py-1 text-sm text-brand-800 hover:border-brand-500 hover:bg-brand-50 transition"
                  onClick={() => navigate(`/get-templates?q=${encodeURIComponent(chip)}`)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </MarketingHero>

      <StatBand stats={STATS} />

      <ContentSection tone="sky" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading
            title="Explore templates by category"
            subtitle="Ready-made Excel and Google Sheets files for shops, NGOs, and offices."
          />
          <RevealGrid className="mt-10 sm:mt-12 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4" stagger={70}>
            {CATEGORY_CATALOG.map((c) => (
              <CategoryCard key={c.name} name={c.name} size="md" />
            ))}
          </RevealGrid>
          <p className="mt-10 text-center">
            <Link to="/categories" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900">
              View all categories →
            </Link>
          </p>
        </div>
      </ContentSection>

      <ContentSection tone="slate" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="Find your next workbook" subtitle="Popular templates, courses, and fresh uploads." />
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {(
              [
                ['popular', 'Popular templates'],
                ['institute', 'Learn courses'],
                ['newest', 'New templates'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  tab === id ? 'bg-brand-700 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-700 hover:border-brand-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'institute' ? (
            <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((c) => (
                <Link key={c.id} to={`/courses/${c.id}`} className="group rounded-2xl border border-stone-200 bg-white p-5 hover:shadow-lg hover:border-brand-300 transition">
                  {c.featured && <p className="text-xs font-semibold uppercase text-[#00a651]">Featured</p>}
                  <p className="text-xs font-bold uppercase text-brand-700">{c.level}</p>
                  <h3 className="mt-2 font-display font-bold text-lg group-hover:text-brand-700">{c.title}</h3>
                  <p className="mt-2 text-sm text-stone-600 line-clamp-2">{c.description}</p>
                </Link>
              ))}
              {courses.length === 0 && <p className="col-span-full text-center text-stone-500">Courses load when the API is running.</p>}
            </div>
          ) : (
            <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {catalogTemplates.map((t) => (
                <Link key={t.id} to={`/templates/${t.id}`} className="group rounded-2xl border border-stone-200 bg-white overflow-hidden hover:shadow-lg hover:border-brand-300 transition">
                  <div className="aspect-[16/10] bg-stone-100 overflow-hidden">
                    {t.previewUrl ? (
                      <LazyImage src={t.previewUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                    ) : (
                      <div className="h-full grid place-items-center text-stone-400 text-sm">Preview</div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-bold uppercase text-brand-700">{t.category}</span>
                    <p className="mt-1 font-bold line-clamp-2 group-hover:text-brand-700">{t.title}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      {t.averageRating.toFixed(1)}★ · {t.downloadCount} downloads
                    </p>
                  </div>
                </Link>
              ))}
              {catalogTemplates.length === 0 && (
                <p className="col-span-full text-center text-stone-500">Templates appear after the API is running and seeded.</p>
              )}
            </div>
          )}
          <p className="mt-10 text-center">
            <Link to={tab === 'institute' ? '/learn' : '/get-templates'} className="font-semibold text-brand-700 hover:text-brand-900">
              View all {tab === 'institute' ? 'courses' : 'templates'} →
            </Link>
          </p>
        </div>
      </ContentSection>

      <ContentSection tone="mint" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="Advance your skills" subtitle="Practical paths for traders, finance desks, and students." />
          <RevealGrid className="mt-10 sm:mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" stagger={90}>
            <FeatureCard to="/build" title="Build your own template" body="Describe any file. Get a workbook." icon="✨" />
            <FeatureCard to="/learn" title="Learn" body="Courses with Liberia examples." icon="📚" />
            <FeatureCard to="/automations" title="Automate" body="Connect sheets to daily workflows." icon="⚡" />
            <FeatureCard to="/community" title="Community" body="Ask, share, and follow creators." icon="🤝" />
          </RevealGrid>
        </div>
      </ContentSection>

      <ContentSection tone="brand" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="How it works" subtitle="From signup to a working spreadsheet in four steps." />
          <div className="mt-12 grid md:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <StepCard key={s.n} n={s.n} title={s.title} body={s.body} />
            ))}
          </div>
        </div>
      </ContentSection>

      <ContentSection tone="cream" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="Learners across Liberia" subtitle="Real stories from shops, NGOs, and distributors." />
          <div className="mt-10 sm:mt-12 grid md:grid-cols-3 gap-5 sm:gap-6">
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.name} quote={t.quote} name={t.name} role={t.role} img={t.img} />
            ))}
          </div>
        </div>
      </ContentSection>

      <CtaBand
        title="Learn on the go"
        subtitle="Browse templates and course lessons even when the connection drops."
        primary={{ label: 'Create a free account', to: '/register' }}
        secondary={{ label: 'Browse courses', to: '/learn' }}
      />

      <ContentSection tone="white" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <Reveal>
          <div className="relative rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 md:p-12 grid md:grid-cols-2 gap-8 sm:gap-10 items-center overflow-hidden shadow-xl">
            <div>
              <h2 className="font-display text-3xl font-bold text-brand-800">Train your team</h2>
              <p className="mt-4 text-stone-600 leading-relaxed">
                From market stalls to county offices, give staff one catalog of templates and courses — Orange Money and Visa included.
              </p>
              <Link to="/contact" className="mt-6 inline-block rounded-full bg-brand-700 px-8 py-3 font-bold text-white shadow-md hover:bg-brand-800 transition">
                Talk to us
              </Link>
            </div>
            <ul className="space-y-3 text-sm text-stone-700">
              {['Shared workbooks for shops and NGOs', 'Learning paths for clerks and officers', 'Creator studio if your team sells templates'].map((item) => (
                <li key={item} className="flex gap-3 items-start">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[#00a651] text-xs font-bold">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          </Reveal>
        </div>
      </ContentSection>

      <ContentSection id="pricing" tone="sky" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="Simple pricing" subtitle="Start free. Upgrade when your team grows." />
          <div className="mt-8 flex justify-center gap-2 text-sm">
            <button type="button" onClick={() => setYearly(false)} className={`px-5 py-2 rounded-full font-semibold transition ${!yearly ? 'bg-brand-700 text-white shadow' : 'border border-stone-200'}`}>
              Monthly
            </button>
            <button type="button" onClick={() => setYearly(true)} className={`px-5 py-2 rounded-full font-semibold transition ${yearly ? 'bg-brand-700 text-white shadow' : 'border border-stone-200'}`}>
              Yearly (save ~20%)
            </button>
          </div>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            <PricingCard name="Free" price="$0" points={['Basic templates', 'Limited builds', '1 free course']} cta="/register" />
            <PricingCard
              name="Pro"
              price={`$${proPrice}${yearly ? '/mo billed yearly' : '/mo'}`}
              highlight
              points={['Unlimited templates', 'Full builder access', 'All courses']}
              cta="/register"
            />
            <PricingCard name="Enterprise" price="Custom" points={['Dedicated support', 'SSO-ready roadmap', 'Volume licensing']} cta="/contact" />
            <PricingCard name="Creator" price="70% keep" points={['Upload and sell templates', 'Keep 70% of each sale', 'Creator studio']} cta="/register" />
          </div>
        </div>
      </ContentSection>

      <ContentSection tone="mint" className="py-12 sm:py-14 px-4 sm:px-6">
        <div className="landing-container max-w-3xl">
          <SectionHeading title="FAQ" />
          <div className="mt-8 divide-y rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            {FAQS.map(([q, a], i) => (
              <div key={q}>
                <button
                  type="button"
                  className="w-full text-left px-6 py-4 font-semibold text-brand-800 hover:bg-brand-50/50 transition flex justify-between items-center gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {q}
                  <span className="text-brand-400 text-xl shrink-0">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <p className="px-6 pb-5 text-sm text-stone-600 leading-relaxed">{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </ContentSection>

      <ContentSection tone="slate" className="py-12 sm:py-14 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="From the blog" subtitle="Guides for traders, NGOs, and finance teams." align="left" />
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            {BLOG_POSTS.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="group rounded-2xl border border-stone-200 bg-white p-6 hover:border-brand-400 hover:shadow-lg transition">
                <p className="text-xs font-bold uppercase text-[#00a651]">{p.category}</p>
                <h3 className="mt-2 font-display font-bold text-xl group-hover:text-brand-700">{p.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </ContentSection>

      <ContentSection tone="brand" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container max-w-xl text-center">
          <SectionHeading title="Join the waitlist & newsletter" subtitle="Product updates for Liberia and West Africa." />
          <div className="mt-6">
            <NewsletterForm source="waitlist" />
          </div>
        </div>
      </ContentSection>
    </LandingPageRoot>
  );
}
