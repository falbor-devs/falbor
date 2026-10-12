"use client";

import Link from 'next/link';
import { BILLING_CONFIG } from '~/lib/billing/config';

export default function PricingSection() {
  const plans = Object.values(BILLING_CONFIG.plans);

  return (
    <section id="pricing" className="py-16 md:py-32 bg-white dark:bg-black text-zinc-900 dark:text-white relative overflow-hidden transition-colors duration-200">
      <div
        className="absolute inset-0 opacity-[0.25] dark:opacity-[0.05] bg-[radial-gradient(rgba(0,0,0,0.15)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)]"
        style={{ backgroundSize: '32px 32px' }}
      />
      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            Choose the plan that best fits your workflow. Subscriptions attach to your user account and work across all your workspaces.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl p-6 border transition-all ${
                plan.popular
                  ? 'border-purple-500/80 bg-purple-500/5 dark:bg-purple-950/20 shadow-xl'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-zinc-900 dark:text-white">${plan.price}</span>
                  <span className="text-xs text-zinc-500 font-medium">/month</span>
                </div>
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-2">
                  ⚡ {plan.monthlyCredits} Credits / month
                </p>

                <hr className="border-zinc-200 dark:border-zinc-800 my-4" />

                <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="i-ph:check-circle-fill text-emerald-500 text-sm shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link href="/signup" className="block w-full">
                  <button className={`w-full font-bold py-2.5 rounded-xl transition-all text-xs ${
                    plan.popular
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
                      : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900'
                  }`}>
                    Get Started with {plan.name}
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}