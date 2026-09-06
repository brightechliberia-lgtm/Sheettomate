import { Link } from 'react-router-dom';
import CourseCatalog from '../components/CourseCatalog';
import MarketingHero from '../components/MarketingHero';
import { ContentSection, CtaBand, FeatureCard, LandingPageRoot, SectionHeading } from '../components/landing/LandingUI';
import Seo from '../components/Seo';

export default function LearnLandingPage() {
  return (
    <LandingPageRoot>
      <Seo
        title="Learn spreadsheets"
        description="Free and paid courses for Excel and Google Sheets — built with Liberia and West Africa examples."
        path="/learn"
      />
      <MarketingHero
        pillar="learn"
        eyebrow="Sheettomate Institute"
        title="Learn spreadsheets that matter"
        subtitle="Beginner to advanced lessons for traders, NGO staff, and students — practical files, not theory only."
        variant="mint"
      >
        <Link
          to="/register"
          className="inline-block rounded-full bg-gradient-to-r from-accent-600 to-brand-700 px-6 sm:px-8 py-3 sm:py-3.5 font-bold text-white shadow-lg shadow-accent-900/20 hover:shadow-xl motion-safe:transition"
        >
          Start learning free
        </Link>
      </MarketingHero>

      <ContentSection tone="cream" className="py-12 sm:py-14 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="Why learn with us" subtitle="Courses built around real Liberian business scenarios." />
          <div className="mt-10 grid sm:grid-cols-3 gap-4 sm:gap-5">
            <FeatureCard title="Practical lessons" body="Cashbooks, grants, inventory — not abstract theory." icon="📊" />
            <FeatureCard title="Certificates" body="Show progress to employers and partners." icon="🎓" />
            <FeatureCard title="Practice files" body="Download spreadsheets you can use at work." icon="📁" />
          </div>
        </div>
      </ContentSection>

      <ContentSection tone="white" reveal={false}>
        <CourseCatalog showSearch={false} />
      </ContentSection>

      <CtaBand
        title="Start your first course today"
        subtitle="Free account. Browse the catalog and enroll in minutes."
        primary={{ label: 'Create free account', to: '/register' }}
        secondary={{ label: 'View all courses', to: '/courses' }}
      />
    </LandingPageRoot>
  );
}
