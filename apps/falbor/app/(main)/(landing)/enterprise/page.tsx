'use client';

import React, { useState } from 'react';
import DefaultDemo from "~/components/landing/Navbar";
import { LandingScrollHandler } from "~/components/landing/landing-scroll-handler";
import { ThemeHandler } from "~/components/landing/ThemeHandler";
import Footer from "~/components/landing/Footer";
import { CheckCircle2, Shield, Zap, Lock, Server } from 'lucide-react';
import { Input } from '~/components/ui';

export default function EnterprisePage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    workEmail: '',
    role: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col relative min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-200">
      <ThemeHandler force="light" />
      <LandingScrollHandler />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat dark:hidden"
        style={{
          backgroundImage: "url('/background/TESTY.png')",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 hidden bg-cover bg-center bg-no-repeat dark:block"
        style={{
          backgroundImage: "url('/background/bg__dark.png')",
        }}
      />
      <div className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-16px)] md:w-[calc(100%-48px)] max-w-5xl pointer-events-auto">
        <div className="w-full rounded-xl border border-zinc-200 dark:border-white/10" style={{ backdropFilter: 'blur(20px)' }}>
          <DefaultDemo />
        </div>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-6 pt-32 text-left md:px-6 md:pt-44">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-6 space-y-8 text-left">
            <h1 className="text-2xl md:text-3xl lg:text-4xl tracking-tight text-zinc-900 dark:text-white leading-[1.1] text-left">
              Scale your development with dedicated AI.
            </h1>

            <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed text-left">
              Falbor Enterprise equips engineering organizations with custom AI model tiers, isolated cloud environments, dedicated support, and custom compliance configurations.
            </p>

            <div className="space-y-6 pt-4 text-left">
              <div className="flex items-start gap-4 text-left">
                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white mt-0.5 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Custom Isolation & Security</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Dedicated database clusters and VPC deployments tailored to your security requirements.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left">
                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white mt-0.5 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Custom AI Model Quotas</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">High-throughput rate limits, custom token allocations, and dedicated AI pipeline processing.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left">
                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white mt-0.5 shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Dedicated Support & Review</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Direct Slack/Discord channel access, priority onboarding, and custom SLA agreements.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 bg-zinc-50 dark:bg-zinc-900/60 p-8 md:p-10 rounded-md border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {submitted ? (
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 text-[#0099ff]" />
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Submission Received</h2>
                <p className="text-zinc-600 dark:text-zinc-300 max-w-md">
                  Thank you for your interest in Falbor Enterprise. Our team reviews all incoming submissions and will reach out via your work email if your project matches our enterprise criteria.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-2xl text-zinc-900 dark:text-white">Talk to our team</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Fill in your company details. We review submissions individually to assess fit.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      First Name *
                    </label>
                    <Input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Jane"
                      className="w-full px-4 py-2.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0099ff] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Last Name *
                    </label>
                    <Input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className="w-full px-4 py-2.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0099ff] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Work Email * (Company Email Required)
                  </label>
                  <Input
                    type="email"
                    name="workEmail"
                    required
                    value={formData.workEmail}
                    onChange={handleChange}
                    placeholder="jane@company.com"
                    className="w-full px-4 py-2.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0099ff] text-sm"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">Personal webmail providers (Gmail, Yahoo, etc.) are automatically filtered out.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Your Role / Title *
                  </label>
                  <select
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0099ff] text-sm"
                  >
                    <option value="">Select your role</option>
                    <option value="CTO / VP Engineering">CTO / VP of Engineering</option>
                    <option value="Product Manager / Lead">Product Manager / Product Lead</option>
                    <option value="Software Engineer / Architect">Software Engineer / Architect</option>
                    <option value="Founder / CEO">Founder / CEO</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    What would you like to discuss with us? *
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your team, deployment goals, or custom requirements..."
                    className="w-full px-4 py-2.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0099ff] text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-md bg-[#0099ff] hover:bg-[#0088ee] text-white text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Enterprise Inquiry'}
                </button>

                <p className="text-xs text-center text-zinc-400">
                  Submissions are reviewed selectively. We reserve the right to respond only to relevant business inquiries.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
