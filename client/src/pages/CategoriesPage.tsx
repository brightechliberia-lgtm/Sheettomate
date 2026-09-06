import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import CategoryCard from '../components/CategoryCard';
import MarketingHero from '../components/MarketingHero';
import { ContentSection, LandingPageRoot, RevealGrid, SectionHeading } from '../components/landing/LandingUI';
import { CATEGORY_CATALOG } from '../content/categories';

export default function CategoriesPage() {
  return (
    <LandingPageRoot>
      <Seo
        title="Browse template categories"
        description="Finance, NGO, FMCG, health, and more — Excel and Google Sheets templates for Liberia and West Africa."
        path="/categories"
      />
      <MarketingHero
        eyebrow="Marketplace"
        title="Explore templates by category"
        subtitle="Ready-made workbooks for shops, NGOs, schools, and offices across Liberia."
        variant="mint"
      />
      <ContentSection tone="sky" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading
            title={`${CATEGORY_CATALOG.length} categories`}
            subtitle="Finance, inventory, grants, payroll, and more — pick what fits your work."
          />
          <RevealGrid className="mt-10 sm:mt-12 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5" stagger={60}>
            {CATEGORY_CATALOG.map((c) => (
              <CategoryCard key={c.name} name={c.name} size="lg" />
            ))}
          </RevealGrid>
          <p className="mt-12 text-center">
            <Link to="/get-templates" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-600 to-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg motion-safe:transition">
              View all templates →
            </Link>
          </p>
        </div>
      </ContentSection>
    </LandingPageRoot>
  );
}
