import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import CommunityFeed from '../components/CommunityFeed';
import MarketingHero from '../components/MarketingHero';
import { ContentSection, FeatureCard, LandingPageRoot, RevealGrid, SectionHeading } from '../components/landing/LandingUI';
import Seo from '../components/Seo';

export default function CommunityPage() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    activities: { id: string; type: string; body: string; link?: string | null; createdAt: string; user?: { id: string; name: string } }[];
    totw: { weekKey: string; items: { votes: number; template?: { id: string; title: string } }[] };
    showcase: { id: string; title: string; category: string; createdBy: { id: string; name: string } }[];
  } | null>(null);

  useEffect(() => {
    api<NonNullable<typeof data>>('/community/feed')
      .then(setData)
      .catch(() => setData(null));
    if (user) void api('/community/heartbeat', { method: 'POST', body: JSON.stringify({}) });
  }, [user]);

  return (
    <LandingPageRoot>
      <Seo title="Community" description="Sheettomate community feed, showcase, and Template of the Week." path="/community" />
      <MarketingHero
        eyebrow="Connect"
        title="Community"
        subtitle="Share templates, vote, and learn together with creators across Liberia."
        variant="warm"
      >
        <nav className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          {[
            { to: '/community/forum', label: 'Forum' },
            { to: '/community/leaderboard', label: 'Leaderboard' },
            { to: '/community/challenges', label: 'Events' },
            { to: '/community/workspaces', label: 'Workspaces' },
            { to: '/guidelines', label: 'Guidelines' },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full border border-stone-200/80 bg-white/90 backdrop-blur px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-brand-700 hover:border-accent-400 hover:bg-accent-50 motion-safe:transition"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </MarketingHero>

      <ContentSection tone="sky" className="py-10 sm:py-12 px-4 sm:px-6">
        <div className="landing-container grid sm:grid-cols-3 gap-4">
          <FeatureCard to="/community/forum" title="Forum" body="Ask questions and share tips." icon="💬" />
          <FeatureCard to="/community/challenges" title="Events" body="Weekly challenges and showcases." icon="🏆" />
          <FeatureCard to="/community/leaderboard" title="Leaderboard" body="See top contributors." icon="⭐" />
        </div>
      </ContentSection>

      <ContentSection tone="slate" className="py-10 sm:py-12 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="Template of the Week" subtitle="Vote on your favorites each week." />
          <RevealGrid className="mt-8 grid sm:grid-cols-2 gap-4" stagger={80}>
            {(data?.totw?.items ?? []).map((row) => (
              <div key={row.template?.id ?? row.votes} className="rounded-2xl border border-white/80 bg-white/95 backdrop-blur p-5 shadow-sm hover:shadow-md motion-safe:transition h-full">
                {row.template ? (
                  <Link to={`/templates/${row.template.id}`} className="font-display font-bold text-lg text-brand-800 hover:text-accent-700">
                    {row.template.title}
                  </Link>
                ) : (
                  '—'
                )}
                <p className="text-sm text-stone-500 mt-1">{row.votes} votes</p>
              </div>
            ))}
            {!data?.totw?.items?.length && (
              <p className="col-span-full text-sm text-stone-500 text-center py-8">Vote on a template detail page to start this week’s race.</p>
            )}
          </RevealGrid>
        </div>
      </ContentSection>

      <ContentSection tone="mint" className="py-10 sm:py-12 px-4 sm:px-6">
        <div className="landing-container">
          <SectionHeading title="Showcase" subtitle="Standout templates from the community." />
          <RevealGrid className="mt-8 grid sm:grid-cols-2 gap-4" stagger={80}>
            {(data?.showcase ?? []).map((t) => (
              <div key={t.id} className="rounded-2xl border border-white/80 bg-white/95 backdrop-blur p-5 hover:border-accent-300 hover:shadow-md motion-safe:transition h-full">
                <Link to={`/templates/${t.id}`} className="font-semibold text-brand-800 hover:text-accent-700">
                  {t.title}
                </Link>
                <p className="text-xs text-stone-500 mt-1">
                  {t.category} · <Link to={`/u/${t.createdBy.id}`} className="text-brand-600">{t.createdBy.name}</Link>
                </p>
              </div>
            ))}
          </RevealGrid>
        </div>
      </ContentSection>

      <ContentSection tone="cream" className="py-10 sm:py-12 px-4 sm:px-6 pb-16">
        <div className="landing-container">
          <SectionHeading title="Live feed" />
          <div className="mt-8 rounded-2xl border border-stone-200/80 bg-white/95 backdrop-blur p-4 sm:p-5 shadow-sm">
            <CommunityFeed items={data?.activities ?? []} />
          </div>
        </div>
      </ContentSection>
    </LandingPageRoot>
  );
}
