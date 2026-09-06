import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import MarketingHero from '../components/MarketingHero';
import { ContentSection, LandingPageRoot } from '../components/landing/LandingUI';
import { Reveal } from '../components/landing/Reveal';
import Seo from '../components/Seo';
import { api } from '../lib/api';

const CONTACT_ITEMS = [
  { label: 'Email', value: 'hello@sheettomate.com' },
  { label: 'Location', value: 'Monrovia, Liberia · West Africa' },
  {
    label: 'Help with',
    value: 'Template purchases, Institute enrollments, creator payouts, Orange Money / Mobile Money checkout.',
  },
];

export default function ContactPage() {
  const [status, setStatus] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api('/marketing/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          email: fd.get('email'),
          name: fd.get('name'),
          source: 'contact',
          message: fd.get('message'),
        }),
      });
      setStatus('Thanks — we received your message.');
      e.currentTarget.reset();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Send failed');
    }
  }

  return (
    <LandingPageRoot>
      <Seo title="Contact" description="Talk to the Sheettomate team in Liberia." path="/contact" />
      <MarketingHero
        eyebrow="Get in touch"
        title="Contact us"
        subtitle="Monrovia-based product team. We reply by email within a few business days."
        variant="warm"
      />

      <ContentSection tone="slate" className="py-14 sm:py-16 px-4 sm:px-6">
        <div className="landing-container grid md:grid-cols-2 gap-10 sm:gap-12">
          <Reveal variant="left">
            <div>
              <div className="relative">
                <div className="absolute -inset-3 rounded-2xl bg-gradient-to-tr from-accent-100 to-brand-50 -z-10" aria-hidden />
                <LazyImage
                  src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=640&h=480&fit=crop&q=80"
                  alt=""
                  className="rounded-2xl w-full aspect-video object-cover shadow-lg"
                />
              </div>
              <div className="mt-8 space-y-4">
                {CONTACT_ITEMS.map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/80 bg-white/90 backdrop-blur p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-accent-700">{item.label}</p>
                    <p className="mt-1 text-sm text-stone-700">{item.value}</p>
                  </div>
                ))}
              </div>
              <Link to="/guidelines" className="mt-6 inline-block text-sm font-semibold text-brand-700 hover:text-brand-900">
                Community guidelines →
              </Link>
            </div>
          </Reveal>

          <Reveal variant="right" delay={100}>
            <form onSubmit={submit} className="relative rounded-2xl border border-stone-200/80 bg-white/95 backdrop-blur p-6 sm:p-8 shadow-xl h-fit space-y-4">
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-accent-500 via-brand-600 to-[#BF0A30]" aria-hidden />
              <h2 className="font-display text-xl font-bold text-brand-800">Send a message</h2>
              <input name="name" placeholder="Your name" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition" />
              <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition" />
              <textarea
                name="message"
                required
                minLength={10}
                placeholder="How can we help?"
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 min-h-36 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition"
              />
              <button type="submit" className="w-full rounded-full bg-gradient-to-r from-brand-700 to-brand-800 text-white py-3 font-semibold hover:from-brand-800 hover:to-brand-900 shadow-md motion-safe:transition">
                Send message
              </button>
              {status && <p className="text-sm text-stone-600">{status}</p>}
            </form>
          </Reveal>
        </div>
      </ContentSection>
    </LandingPageRoot>
  );
}
