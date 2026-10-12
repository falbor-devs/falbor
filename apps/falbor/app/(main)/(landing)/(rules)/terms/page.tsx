'use client';

import DefaultDemo from '~/components/landing/Navbar';
import { LandingScrollHandler } from '~/components/landing/landing-scroll-handler';
import { ThemeHandler } from '~/components/landing/ThemeHandler';
import { useState } from 'react';

const sections = [
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'description', label: 'Description of Service' },
  { id: 'accounts', label: 'User Accounts' },
  { id: 'credits', label: 'Credits & Subscriptions' },
  { id: 'acceptable-use', label: 'Acceptable Use' },
  { id: 'ip', label: 'Intellectual Property' },
  { id: 'privacy', label: 'Privacy & Data' },
  { id: 'disclaimer', label: 'Disclaimer' },
  { id: 'liability', label: 'Limitation of Liability' },
  { id: 'termination', label: 'Termination' },
  { id: 'changes', label: 'Changes to Terms' },
  { id: 'contact', label: 'Contact Us' },
];

export default function TermsOfService() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleSectionClick = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full flex flex-col relative min-h-screen bg-white text-zinc-900">
      <ThemeHandler force="light" />
      <LandingScrollHandler />

      {}
      <div className="sticky top-0 left-0 right-0 w-full z-[100] bg-white/80 backdrop-blur-md">
        <DefaultDemo />
      </div>

      {}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#FFF7F3] to-white border-b border-zinc-100">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(217,122,85,0.13) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D97A55]/30 bg-[#D97A55]/8 px-4 py-1.5 text-sm font-medium text-[#D97A55] mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Legal Document
          </div>
          <h1
            className="text-5xl font-bold tracking-tight text-zinc-900 mb-4"
            style={{
              fontFamily: '"Google Sans", sans-serif',
              fontOpticalSizing: 'auto',
            }}
          >
            Terms of <span className="text-[#D97A55]">Service</span>
          </h1>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto">
            Please read these terms carefully before using Falbor. By accessing or using our services, you agree to be bound by these terms.
          </p>
          <p className="mt-4 text-sm text-zinc-400">
            Effective date:{' '}
            <time dateTime="2025-07-01">
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          </p>
        </div>
      </div>

      {}
      <div className="mx-auto max-w-5xl w-full px-6 py-16 flex flex-col lg:flex-row gap-12">
        {}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-28">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Contents
            </p>
            <nav className="flex flex-col gap-1">
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  id={`toc-${s.id}`}
                  onClick={() => handleSectionClick(s.id)}
                  className={`group flex items-center gap-3 text-left rounded-lg px-3 py-2 text-sm transition-all duration-150 ${activeSection === s.id
                    ? 'bg-[#D97A55]/10 text-[#D97A55] font-medium'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                    }`}
                >
                  <span
                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${activeSection === s.id
                      ? 'bg-[#D97A55] text-white'
                      : 'bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200'
                      }`}
                  >
                    {i + 1}
                  </span>
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {}
        <div className="flex-1 min-w-0">
          {}
          <div className="lg:hidden mb-10 rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              Quick Navigation
            </p>
            <div className="flex flex-wrap gap-2">
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => handleSectionClick(s.id)}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 hover:border-[#D97A55]/50 hover:text-[#D97A55] transition-colors"
                >
                  <span className="w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center text-[9px] font-bold text-zinc-500">
                    {i + 1}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-12 text-zinc-700 leading-relaxed">
            {}
            <Section id="acceptance" number={1} title="Acceptance of Terms">
              <p>
                By accessing or using Falbor ("the Service," "we," "us," or "our"), you agree to be legally bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. Your continued use of Falbor constitutes your ongoing acceptance of any updates to these Terms.
              </p>
            </Section>

            {}
            <Section id="description" number={2} title="Description of Service">
              <p>
                Falbor is an AI-powered chat platform that provides access to large language models and AI tools. The Service is currently in <strong className="text-zinc-900">beta</strong>, meaning features may be incomplete, subject to change, or temporarily unavailable. We make no guarantee of uninterrupted or error-free service during this period.
              </p>
              <Callout icon="🚧">
                Because Falbor is in beta, you may encounter unexpected behavior. We appreciate your patience and feedback as we improve the platform.
              </Callout>
            </Section>

            {}
            <Section id="accounts" number={3} title="User Accounts">
              <p>
                To access most features of Falbor, you must create an account. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. You agree to:
              </p>
              <ul className="list-none space-y-2 mt-4">
                {[
                  'Provide accurate and up-to-date information during registration.',
                  'Notify us immediately of any unauthorized use of your account.',
                  'Not share your account credentials with others.',
                  'Be at least 13 years of age (or the minimum age required in your jurisdiction).',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 w-4 h-4 rounded-full bg-[#D97A55]/15 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="#D97A55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                We reserve the right to suspend or delete accounts that violate these Terms.
              </p>
            </Section>

            {}
            <Section id="credits" number={4} title="Credits & Subscriptions">
              <p>
                Falbor operates on a credit-based billing system. Here is what you need to know:
              </p>
              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                {[
                  { icon: '🎁', title: 'Free Monthly Credits', body: 'Every user receives $1 in free credits each calendar month. Credits reset at the start of each billing cycle.' },
                  { icon: '💳', title: 'Immediate Payment', body: 'All subscription purchases require immediate payment. We do not support deferred or post-dated billing.' },
                  { icon: '🔄', title: 'Monthly Resets', body: 'Unused free credits do not roll over. Purchased credits follow the terms of your specific plan.' },
                  { icon: '📋', title: 'Review Before Purchase', body: 'Before purchasing, carefully review the features and credit limits included in each subscription tier.' },
                ].map((card) => (
                  <div key={card.title} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                    <div className="text-xl mb-2">{card.icon}</div>
                    <p className="font-semibold text-zinc-900 text-sm mb-1">{card.title}</p>
                    <p className="text-zinc-500 text-sm">{card.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm text-zinc-500 italic">
                All purchases are final. Refunds are issued at our sole discretion and only in cases of documented service failure on our end.
              </p>
            </Section>

            {}
            <Section id="acceptable-use" number={5} title="Acceptable Use">
              <p>
                You agree to use Falbor only for lawful purposes and in a manner that does not infringe on the rights of others. The following activities are strictly prohibited:
              </p>
              <div className="mt-5 space-y-3">
                {[
                  { label: 'Harmful Content', desc: 'Generating content that is illegal, defamatory, harassing, threatening, or otherwise harmful.' },
                  { label: 'System Abuse', desc: 'Attempting to exploit, reverse-engineer, or circumvent any security measures of the platform.' },
                  { label: 'Impersonation', desc: 'Impersonating any person, entity, or Falbor staff.' },
                  { label: 'Automated Abuse', desc: 'Using automated scripts, bots, or scrapers to access the Service in an unauthorized way.' },
                  { label: 'Illegal Activities', desc: 'Using the Service for any activity that violates applicable local, national, or international laws.' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-lg border border-red-50 bg-red-50/60 px-4 py-3">
                    <span className="mt-0.5 shrink-0 text-red-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </span>
                    <span className="text-sm">
                      <strong className="text-zinc-800">{item.label}:</strong>{' '}
                      <span className="text-zinc-600">{item.desc}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4">
                Violations may result in immediate account suspension or termination without refund.
              </p>
            </Section>

            {}
            <Section id="ip" number={6} title="Intellectual Property">
              <p>
                All content, trademarks, logos, and intellectual property associated with Falbor are owned by or licensed to us. You may not copy, distribute, or create derivative works from our proprietary materials without explicit written permission.
              </p>
              <p className="mt-3">
                Content you generate through the Service using AI models remains your responsibility. You grant Falbor a non-exclusive license to process and store your inputs solely to operate and improve the Service.
              </p>
            </Section>

            {}
            <Section id="privacy" number={7} title="Privacy & Data">
              <p>
                Your use of Falbor is also governed by our{' '}
                <a href="/privacy" className="text-[#D97A55] hover:underline font-medium">
                  Privacy Policy
                </a>
                . When you interact with the chat, your inputs are sent to our servers and processed through third-party AI model APIs. Our team may review this data to:
              </p>
              <ul className="list-none mt-4 space-y-2">
                {[
                  'Identify bugs, errors, and unexpected behavior.',
                  'Improve model quality and relevance.',
                  'Address misuse or harmful outputs.',
                  'Understand user needs and product gaps.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 text-[#D97A55]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                We take data privacy seriously and implement reasonable security measures to protect your information.
              </p>
            </Section>

            {}
            <Section id="disclaimer" number={8} title="Disclaimer of Warranties">
              <p>
                The Service is provided <strong className="text-zinc-900">"as is"</strong> and{' '}
                <strong className="text-zinc-900">"as available"</strong> without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that:
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  'The Service will be uninterrupted or error-free.',
                  'AI-generated outputs will be accurate, complete, or suitable for your purpose.',
                  'The Service will be free of viruses or other harmful components.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 text-amber-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {}
            <Section id="liability" number={9} title="Limitation of Liability">
              <p>
                To the fullest extent permitted by applicable law, Falbor and its affiliates, officers, directors, employees, or agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, even if we have been advised of the possibility of such damages.
              </p>
              <p className="mt-3">
                Our total liability to you for any claims arising from these Terms or the Service shall not exceed the amount you paid to Falbor in the 12 months preceding the claim.
              </p>
            </Section>

            {}
            <Section id="termination" number={10} title="Termination">
              <p>
                We reserve the right to suspend or terminate your access to the Service at any time, with or without notice, for any violation of these Terms or for any other reason at our sole discretion. Upon termination:
              </p>
              <ul className="mt-4 space-y-2 list-none">
                {[
                  'Your right to use the Service will cease immediately.',
                  'Any unused purchased credits may be forfeited unless required otherwise by law.',
                  'Sections of these Terms that by their nature should survive will remain in effect.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 w-4 h-4 rounded-full bg-zinc-200 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                You may also terminate your account at any time by contacting us or deleting your account through the settings.
              </p>
            </Section>

            {}
            <Section id="changes" number={11} title="Changes to Terms">
              <p>
                We may update these Terms from time to time. When we make material changes, we will notify you via email or a prominent notice on the platform. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms. We encourage you to review these Terms periodically.
              </p>
            </Section>

            {}
            <Section id="contact" number={12} title="Contact Us">
              <p>
                If you have questions, concerns, or feedback about these Terms of Service, we encourage you to reach out to us:
              </p>
              <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97A55" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <a href="mailto:contact@falbor.xyz" className="text-[#D97A55] font-medium hover:underline">
                  contact@falbor.xyz
                </a>
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                We aim to respond to all inquiries within 2–3 business days.
              </p>
            </Section>

            {}
            <div className="pt-10 mt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-zinc-400">
                Last updated:{' '}
                <time dateTime="2025-07-01">
                  {new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              </p>
              <a
                href="/privacy"
                className="text-sm text-[#D97A55] hover:underline font-medium inline-flex items-center gap-1"
              >
                View Privacy Policy
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 group">
      <div className="flex items-center gap-4 mb-5">
        <span className="shrink-0 w-8 h-8 rounded-full bg-[#D97A55]/10 text-[#D97A55] font-bold text-sm flex items-center justify-center">
          {number}
        </span>
        <h2
          className="text-xl font-semibold text-zinc-900"
          style={{ fontFamily: '"Google Sans", sans-serif' }}
        >
          {title}
        </h2>
        <a
          href={`#${id}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 hover:text-[#D97A55] ml-auto"
          aria-label={`Permalink to ${title}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </a>
      </div>
      <div className="pl-12 space-y-3 text-[15px]">{children}</div>
    </section>
  );
}

function Callout({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3.5">
      <span className="text-lg shrink-0">{icon}</span>
      <p className="text-sm text-amber-800">{children}</p>
    </div>
  );
}
