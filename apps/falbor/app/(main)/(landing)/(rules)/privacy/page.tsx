'use client';

import DefaultDemo from "~/components/landing/Navbar";
import { LandingScrollHandler } from "~/components/landing/landing-scroll-handler";
import { ThemeHandler } from "~/components/landing/ThemeHandler";
import Footer from "~/components/landing/Footer";

export default function PrivacyAndTerms() {
  return (
    <div className="w-full flex flex-col relative min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-200">
      <ThemeHandler force="light" />
      <LandingScrollHandler />

      <div className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-16px)] md:w-[calc(100%-48px)] max-w-5xl pointer-events-auto">
        <div className="w-full rounded-xl border border-zinc-200 dark:border-white/10" style={{ backdropFilter: 'blur(20px)' }}>
          <DefaultDemo />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-28 md:pt-36 pb-24 flex-1">
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-16">

          <div className="w-full lg:w-[400px] lg:sticky lg:top-32 shrink-0">
            <div className="relative flex min-h-[420px] md:min-h-[80px] w-full bg-[#EAE7E1] dark:bg-zinc-900 shadow-sm border-t border-b border-r border-zinc-200 dark:border-zinc-800">
              <div className="w-4 sm:w-5 bg-[#0099ff] h-full shrink-0" />
              <div className="flex-1 p-8 sm:p-10 md:p-12 flex flex-col justify-between">
                <div>
                  <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
                    Privacy<br />Policy
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-2xl space-y-12 text-zinc-800 dark:text-zinc-200 leading-relaxed text-base pt-2">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                1. Data Controller & Scope
              </h2>
              <p>
                This Privacy Policy applies to the software platform, web application, and related services operated under the name <strong>Falbor</strong> ("Falbor", "we", "us", or "our"), accessible via <a href="https://falbor.xyz" className="underline font-medium hover:text-[#0099ff] transition-colors">https://falbor.xyz</a> and its subdomains.
              </p>
              <p>
                For users subject to data protection laws, Falbor acts as the data controller determining the purposes and means of processing personal data relating to user account creation, billing, and platform interactions.
              </p>
              <div className="pt-2 text-sm space-y-1 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <p className="font-semibold text-zinc-900 dark:text-white">Contact & Requests:</p>
                <p><a href="mailto:contact@falbor.xyz" className="underline hover:text-[#0099ff] transition-colors">contact@falbor.xyz</a></p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                2. Information We Collect
              </h2>
              <p>
                We process information depending on how you interact with Falbor:
              </p>

              <div className="space-y-3 pt-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">A. Information You Provide Directly</h3>
                <p>
                  When setting up or editing your profile in account settings, we collect your email address, username, display name, bio, avatar image, location, social profile links, timezone, and user profile preferences.
                </p>

                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">B. Information Received from Third-Party Services (OAuth & Integrations)</h3>
                <p>
                  If you authenticate or integrate third-party services (such as Google, Discord, Slack, Miro, or GitHub), we receive basic authentication details made available by that service, which may include your email address, account ID, profile avatar, and authentication tokens required to connect your account.
                </p>

                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">C. Technical & System Log Information</h3>
                <p>
                  IP address, browser type, operating system, access timestamps, and error logs necessary to deliver, debug, and secure the service.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                3. Connected Accounts & Repositories (GitHub Integration)
              </h2>
              <p>
                When you connect a GitHub account or repository to Falbor:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>OAuth Tokens:</strong> Authentication tokens are stored securely to authorize repository operations. When you disconnect GitHub, active connection tokens are removed.</li>
                <li><strong>Repository Scope:</strong> Access is limited to the repository permissions granted during authorization.</li>
                <li><strong>Code & Schema Processing:</strong> We access repository files and project structure to render previews and process AI generation requests initiated by you.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                4. AI Data Processing & Model Providers
              </h2>
              <p>
                Falbor integrates with commercial AI model providers, specifically <strong>OpenAI</strong> and <strong>Anthropic</strong>.
              </p>
              <p>
                When you submit a prompt, request code generation, or process workspace files with AI assistance:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The text of your prompt, selected code snippets, repository files, database schema context, and uploaded files needed to fulfill your request are transmitted over HTTPS to OpenAI or Anthropic API endpoints.</li>
                <li>Data transmitted to third-party AI model providers via developer API integrations is governed by the respective API agreements of OpenAI and Anthropic.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                5. How We Use Information & Training Policy
              </h2>
              <p>
                We process user information for distinct operational purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Delivery:</strong> Managing authentication, account preferences, billing, workspace loading, and live previews.</li>
                <li><strong>Debugging & Security:</strong> Monitoring errors, system telemetry, and latency to fix bugs and secure infrastructure.</li>
                <li><strong>AI Request Execution:</strong> Sending user prompts to AI API endpoints to generate software code.</li>
                <li><strong>No Public Model Training by Falbor:</strong> Falbor does not train public AI foundation models on your private workspace prompts, repository code, or user project content.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                6. Ownership, License & Content Access
              </h2>
              <p>
                <strong>Ownership & License:</strong> Subject to our Terms of Service, you retain ownership of the original prompts, code, and project files you create. You grant Falbor a technical, non-exclusive license to host, store, execute, transmit, and display your project content solely to operate the platform.
              </p>
              <p>
                <strong>Personnel Access:</strong> Access to user workspaces by Falbor personnel is restricted to authorized support requests, technical debugging, or security investigations.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                7. Third-Party Service Providers
              </h2>
              <p>
                We share relevant data with service providers necessary to operate the service:
              </p>
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-300 dark:border-zinc-700">
                      <th className="py-2 font-semibold text-zinc-900 dark:text-white">Provider</th>
                      <th className="py-2 font-semibold text-zinc-900 dark:text-white">Category</th>
                      <th className="py-2 font-semibold text-zinc-900 dark:text-white">Purpose</th>
                      <th className="py-2 font-semibold text-zinc-900 dark:text-white">Data Shared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    <tr>
                      <td className="py-2.5 font-medium">OpenAI</td>
                      <td className="py-2.5">AI Models</td>
                      <td className="py-2.5">Code generation & processing</td>
                      <td className="py-2.5">Prompts, selected code, project context</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium">Anthropic</td>
                      <td className="py-2.5">AI Models</td>
                      <td className="py-2.5">Code generation & processing</td>
                      <td className="py-2.5">Prompts, selected code, project context</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium">Neon</td>
                      <td className="py-2.5">Cloud Database Provider</td>
                      <td className="py-2.5">Data storage hosting</td>
                      <td className="py-2.5">User profile, workspace & project records</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium">Stripe</td>
                      <td className="py-2.5">Payment Processor</td>
                      <td className="py-2.5">Billing & subscriptions</td>
                      <td className="py-2.5">Payment metadata & billing details</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                8. Cookies & Custom Domains
              </h2>
              <p>
                <strong>Cookies:</strong> We use essential session cookies and local storage to maintain login state, user preferences, and workspace context.
              </p>
              <p>
                <strong>Custom Domains & Deployments:</strong> When custom domains or previews are configured, we process domain names, DNS records, and SSL data necessary to route web traffic.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                9. Data Retention, Deletion & Verification
              </h2>
              <p>
                <strong>Data Retention:</strong> Profile details and project workspace files are retained for as long as your account remains active or as needed to provide the service.
              </p>
              <p>
                <strong>Account Deletion & Request Verification:</strong> To request account deletion or data access, email <a href="mailto:contact@falbor.xyz" className="underline font-medium hover:text-[#0099ff] transition-colors">contact@falbor.xyz</a> from the email address registered with your Falbor account. To protect your privacy and security, we verify your identity by confirming matching email credentials before processing account deletion or data access requests. Upon verified deletion, active database records are removed, and residual data in encrypted server backups is overwritten in accordance with standard backup rotation cycles.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                10. Regional Privacy Rights (GDPR & California)
              </h2>
              <p>
                <strong>European (EEA/UK) Users:</strong> Where applicable under GDPR, users have rights regarding access, rectification, erasure, restriction, objection, data portability, and withdrawing consent. You also have the right to lodge a complaint with your local data protection supervisory authority. Legal bases include performance of contract, legitimate interests, and legal obligations.
              </p>
              <p>
                <strong>California Residents:</strong> Where applicable under California privacy laws (CCPA/CPRA), residents may have rights to request access, deletion, correction, and limiting the use of sensitive personal information. Falbor does not sell personal information or discriminate against users exercising privacy rights.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                11. International Transfers & Children's Privacy
              </h2>
              <p>
                <strong>International Data Transfers:</strong> Cloud hosting, database, and AI providers process data in facilities located in various regions (including the United States). Transfers are conducted in accordance with applicable legal transfer mechanisms provided by our vendors.
              </p>
              <p>
                <strong>Children's Privacy (13+ Policy):</strong> Falbor is intended for users who are at least 13 years of age. We do not knowingly collect personal data from children under 13.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                12. Security & Policy Updates
              </h2>
              <p>
                <strong>Security:</strong> We implement encrypted HTTPS data transmission and access security measures. In the event of a security breach affecting user personal data, we will notify impacted users as required by applicable law.
              </p>
              <p>
                <strong>Updates:</strong> Material updates to this policy will be posted on this page with an updated date.
              </p>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1 text-sm">
                <p className="font-semibold text-zinc-900 dark:text-white">Privacy Contact & Identity Verification:</p>
                <p>Email: <a href="mailto:contact@falbor.xyz" className="underline font-medium hover:text-[#0099ff] transition-colors">contact@falbor.xyz</a></p>
              </div>
            </section>

          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
