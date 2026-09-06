import MarketingHero from '../components/MarketingHero';
import { ContentSection, LandingPageRoot } from '../components/landing/LandingUI';
import { Reveal } from '../components/landing/Reveal';
import Seo from '../components/Seo';

export default function GuidelinesPage() {
  return (
    <LandingPageRoot>
      <Seo title="Community guidelines" description="How we keep Sheettomate civil, useful, and safe." path="/guidelines" />
      <MarketingHero
        eyebrow="Community"
        title="Community guidelines"
        subtitle="How we keep Sheettomate civil, useful, and safe for everyone."
        compact
        variant="mint"
      />
      <ContentSection tone="slate" className="py-12 sm:py-14 px-4 sm:px-6">
        <Reveal className="landing-container max-w-3xl">
          <article className="prose prose-stone max-w-none rounded-2xl border border-white/80 bg-white/95 backdrop-blur p-6 sm:p-8 shadow-sm">
            <p>
              Sheettomate is for professionals across Liberia and West Africa sharing spreadsheet craft. Be useful, be kind, and keep
              files safe.
            </p>
            <ul>
              <li>No malware, phishing workbooks, or scraped copyrighted content.</li>
              <li>Reviews and comments should describe the file, not attack people.</li>
              <li>Report spam or harassment. Moderators can remove content and suspend accounts.</li>
              <li>Co-creation workspaces are for invited collaborators only.</li>
            </ul>
            <p>
              Reputation rises when you publish, review fairly, and mark helpful answers. Badges include First Template, Top Creator,
              and Community Helper.
            </p>
          </article>
        </Reveal>
      </ContentSection>
    </LandingPageRoot>
  );
}
