import { Link } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import MarketingHero from '../components/MarketingHero';
import { ContentSection, CtaBand, LandingPageRoot, SectionHeading, StepCard } from '../components/landing/LandingUI';
import { Reveal } from '../components/landing/Reveal';
import Seo from '../components/Seo';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  { n: '1', title: 'Describe your file', body: 'Tell us what rows, columns, and totals you need — in plain language.' },
  { n: '2', title: 'We build the workbook', body: 'Sheettomate structures sheets, formulas, and a preview you can check.' },
  { n: '3', title: 'Download & use', body: 'Open in Excel or Google Sheets. Pay with Orange Money or Visa when needed.' },
];

export default function BuildLandingPage() {
  const { user } = useAuth();

  return (
    <LandingPageRoot>
      <Seo
        title="Build your own template"
        description="Describe any spreadsheet you need and download a ready workbook — built for Liberia and West Africa."
        path="/build"
      />
      <MarketingHero
        pillar="build"
        eyebrow="AI builder"
        title="Build your own (any) template"
        subtitle="Cashbook, stock list, grant tracker, invoice log — say what you need. We generate the spreadsheet."
        variant="warm"
      >
        <Link
          to={user ? '/ai' : '/register'}
          className="inline-block rounded-full bg-gradient-to-r from-accent-600 to-brand-700 px-6 sm:px-8 py-3 sm:py-3.5 font-bold text-white shadow-lg shadow-accent-900/20 hover:shadow-xl motion-safe:transition"
        >
          {user ? 'Open the builder' : 'Start free — then build'}
        </Link>
      </MarketingHero>

      <ContentSection tone="white" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container grid md:grid-cols-2 gap-10 sm:gap-12 items-center">
          <Reveal variant="left" className="order-2 md:order-1">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent-100 to-brand-50 -z-10" aria-hidden />
              <LazyImage
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&h=420&fit=crop&q=80"
                alt=""
                className="rounded-2xl w-full aspect-[4/3] object-cover shadow-xl ring-1 ring-stone-200/50"
              />
            </div>
          </Reveal>
          <Reveal variant="right" delay={120} className="order-1 md:order-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-800">From idea to download in minutes</h2>
            <p className="mt-5 text-stone-600 leading-relaxed">
              No blank grid. No guessing formulas. Describe the outcome — daily sales, payroll, inventory — and get a file your team
              can use today.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'Works even without an AI key (smart Excel fallback)',
                'Preview before you download',
                'Save and refine in Creator studio',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-stone-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700 font-bold text-xs">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </ContentSection>

      <ContentSection tone="mint" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="How it works" subtitle="Three steps from description to download." />
          <div className="mt-10 sm:mt-12 grid md:grid-cols-3 gap-5 sm:gap-6">
            {STEPS.map((s) => (
              <StepCard key={s.n} n={s.n} title={s.title} body={s.body} />
            ))}
          </div>
        </div>
      </ContentSection>

      <CtaBand
        title="Ready to build?"
        subtitle="Free account. Describe your first template in under a minute."
        primary={{ label: user ? 'Open builder' : 'Create free account', to: user ? '/ai' : '/register' }}
        secondary={{ label: 'Or get a ready template', to: '/get-templates' }}
      />
    </LandingPageRoot>
  );
}
