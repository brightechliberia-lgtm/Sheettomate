import { Link } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import MarketingHero from '../components/MarketingHero';
import { ContentSection, CtaBand, FeatureCard, LandingPageRoot, SectionHeading, StatBand } from '../components/landing/LandingUI';
import { Reveal } from '../components/landing/Reveal';
import Seo from '../components/Seo';

const STATS = [
  { n: '1,000+', l: 'Professionals learning' },
  { n: '10', l: 'Template categories' },
  { n: '70%', l: 'Paid to creators' },
  { n: 'LR', l: 'Built for Liberia first' },
];

export default function AboutPage() {
  return (
    <LandingPageRoot>
      <Seo title="Our story" description="Sheettomate builds spreadsheet tools for Liberia and West Africa." path="/about" />
      <MarketingHero
        eyebrow="Our story"
        title="Education and business tools for everyone"
        subtitle="Starting with the spreadsheets people already use every day — in Monrovia, across Liberia, and West Africa."
        variant="mint"
      />
      <ContentSection tone="white" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container grid md:grid-cols-2 gap-10 sm:gap-12 items-center">
          <Reveal variant="left">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent-100 to-brand-100/50 -z-10" aria-hidden />
              <LazyImage
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=640&h=480&fit=crop&q=80"
                alt="Team collaborating"
                className="rounded-2xl w-full aspect-[4/3] object-cover shadow-xl ring-1 ring-stone-200/50"
              />
            </div>
          </Reveal>
          <Reveal variant="right" delay={120}>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-800">About Sheettomate</h2>
            <p className="mt-5 text-stone-700 leading-relaxed">
              Sheettomate is a marketplace, AI builder, and training institute for Excel and Google Sheets. We designed payments
              for Orange Money and Mobile Money first, with BanffPay cards as a backup, because that is how people in Liberia
              actually pay.
            </p>
            <p className="mt-4 text-stone-700 leading-relaxed">
              Creators sell templates. Learners enroll in Institute courses. Businesses generate files instead of starting from a
              blank grid.
            </p>
            <Link to="/register" className="mt-8 inline-block rounded-full bg-gradient-to-r from-accent-600 to-brand-700 px-8 py-3 font-bold text-white shadow-lg hover:shadow-xl motion-safe:transition">
              Start free
            </Link>
          </Reveal>
        </div>
      </ContentSection>

      <StatBand stats={STATS} />

      <ContentSection tone="cream" className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="landing-container max-w-3xl text-center">
          <Reveal>
            <blockquote className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold text-brand-800 leading-relaxed italic">
              "Spreadsheet literacy is a practical path into digital work for shops, NGOs, and county offices — we built Sheettomate
              to meet people where they already are."
            </blockquote>
            <p className="mt-6 text-sm font-medium text-stone-500">Sheettomate team · Monrovia, Liberia</p>
          </Reveal>
        </div>
      </ContentSection>

      <ContentSection tone="sky" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="Three ways to grow" subtitle="Templates, courses, and custom files — all in one place." />
          <div className="mt-10 sm:mt-12 grid sm:grid-cols-3 gap-4 sm:gap-5">
            <FeatureCard to="/get-templates" title="Get templates" body="Buy ready-made workbooks from local creators." icon="📥" />
            <FeatureCard to="/learn" title="Learn" body="Structured lessons with West African examples." icon="📚" />
            <FeatureCard to="/build" title="Build your own" body="Describe the file you need; get a download." icon="✨" />
          </div>
        </div>
      </ContentSection>

      <CtaBand
        title="Ready to get started?"
        subtitle="Free account. Templates, builder, and courses in one hub."
        primary={{ label: 'Create free account', to: '/register' }}
        secondary={{ label: 'Browse templates', to: '/get-templates' }}
      />
    </LandingPageRoot>
  );
}
