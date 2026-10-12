'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '~/components/ui/Card';
import { SetupButton } from '~/components/ui/setup/SetupButton';
import { classNames } from '~/utils/classNames';
import { Slider } from '~/components/ui/Slider';
import { CodeBlock } from '~/components/chat/messages/CodeBlock';

const FRAMEWORKS = [
  { id: 'nextjs', name: 'Next.js', logo: '/icons/nextjs.svg' },
  { id: 'react', name: 'React', logo: '/icons/react.svg' },
  { id: 'js', name: 'JavaScript', logo: '/icons/javascript.svg' },
];

export function SDKSetupView() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [setupMode, setSetupMode] = useState<'agent' | 'manual'>('agent');
  const [selectedFramework, setSelectedFramework] = useState('nextjs');
  const [promptExpanded, setPromptExpanded] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/stayup/projects');
        const data = await res.json();
        if (data.success && data.projects.length > 0) {
          setProjects(data.projects);
          setSelectedProjectId(data.projects[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const activeFramework = FRAMEWORKS.find(fw => fw.id === selectedFramework) || FRAMEWORKS[0];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="i-ph:spinner-gap animate-spin w-8 h-8 text-indigo-500" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="p-12 text-center flex flex-col items-center">
        <div className="i-ph:warning-circle w-12 h-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Projects Found</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">You need to create a project before you can set up the SDK.</p>
        <SetupButton onClick={() => window.location.href = '/org-setup'} className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
          Create Project
        </SetupButton>
      </Card>
    );
  }

  const agentPrompt = `
# Add Falbor Telemetry & Auth

Set up the \`falbor-stayup-sdk\` in my project. Please follow these instructions carefully.

## 1. Installation
Run the following command to install the SDK:
\`npm install falbor-stayup-sdk\`

## 2. Environment Setup
Check the environment variables. Ensure that the following keys can be securely injected:
- \`FALBOR_PROJECT_ID=${selectedProject?.id}\`
- \`FALBOR_API_KEY=${selectedProject?.apiKey}\`

## 3. Initialization & API Usage
Create a new utility file (e.g., \`lib/falbor.ts\`) to initialize the SDK with the correct context.

\`\`\`javascript
import stayup from 'falbor-stayup-sdk';

// Initialize with environment variables
export const falborClient = stayup.init({
  projectId: process.env.FALBOR_PROJECT_ID,
  apiKey: process.env.FALBOR_API_KEY,
  environment: process.env.NODE_ENV || 'development',
  options: {
    enableAutoTracking: true,
    debugMode: false,
  }
});
\`\`\`

## 4. Application Wrapping
Inject the initialized client at the root of the application (e.g., \`app/layout.tsx\` or \`src/index.js\`). Use the provider component if available to wrap the children.
`.trim();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 max-w-4xl">
      <div className="relative pl-10 ml-4 pb-12 mt-8">
        <div className="absolute left-[0px] top-0 bottom-0 w-[1px] bg-gray-200 dark:bg-gray-800" />
        <div className="relative -ml-[60px] pl-[60px] pb-8">
          <div className="absolute left-[0px] top-[40px] w-[20px] h-[1px] bg-gray-200 dark:bg-gray-800" />
          <div className="flex gap-4 overflow-x-auto pb-2 px-2 modern-scrollbar">
            {FRAMEWORKS.map(fw => (
              <button
                key={fw.id}
                onClick={() => setSelectedFramework(fw.id)}
                className={classNames(
                  "flex flex-col items-center justify-center p-6 min-w-[120px] rounded-xl border transition-all duration-200 cursor-pointer",
                  selectedFramework === fw.id
                    ? "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
                    : "bg-gray-100 dark:bg-gray-800 border-transparent shadow-sm"
                )}
              >
                <div className="w-10 h-10 mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={fw.logo} alt={fw.name} className="w-6 h-6 object-contain" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fw.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="relative -ml-[60px] pl-[60px] pb-10">
          <Slider
            selected={setupMode}
            options={{
              left: { value: 'agent', text: 'Agent setup' },
              right: { value: 'manual', text: 'Manual setup' }
            }}
            setSelected={(val) => setSetupMode(val as 'agent' | 'manual')}
          />
        </div>
        {setupMode === 'agent' ? (
          <>
            <div className="relative pb-12">
              <div className="absolute -left-[56px] top-1 w-8 h-8 rounded-full bg-white dark:bg-[#111114] flex items-center justify-center shadow-sm ring-4 ring-white dark:ring-[#111114] border border-gray-200 dark:border-gray-700 z-10 overflow-hidden">
                <img src={activeFramework.logo} alt={activeFramework.name} className="w-5 h-5 object-contain" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Prompt your agent to install the SDK
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-2xl">
                Paste the prompt into any AI coding agent. It guides you and your agent through the complete installation and API setup.
              </p>

              <div className="bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {activeFramework.name} guide
                  </span>
                  <SetupButton
                    onClick={() => copyToClipboard(agentPrompt)}
                    className="h-8 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg text-xs font-medium border-none shadow-sm gap-2"
                  >
                    Copy prompt
                    <div className="i-ph:copy w-3 h-3 opacity-80" />
                  </SetupButton>
                </div>

                <div className={classNames(
                  "relative overflow-hidden transition-all duration-300 bg-[#262626] dark:bg-black",
                  !promptExpanded ? "max-h-[260px]" : ""
                )}>
                  <div className="p-4 relative z-10">
                    <CodeBlock
                      code={agentPrompt}
                      language="markdown"
                      disableCopy={true}
                      className="!bg-transparent !border-none !shadow-none"
                    />
                  </div>

                  {!promptExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FAFAFA] dark:from-black to-transparent flex items-end justify-center pb-4 z-20 pointer-events-auto">
                      <button
                        onClick={() => setPromptExpanded(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="i-ph:arrows-out-simple w-3 h-3" />
                        Expand prompt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-[56px] top-1 w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center text-sm font-bold shadow-md ring-4 ring-white dark:ring-[#111114] z-10">
                2
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Run your app and sign up as your first user
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed max-w-2xl">
                Once the installation finishes, start your dev server, then visit <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">http://localhost:3000</code> to sign up as your first user.
              </p>

              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
                <div className="i-ph:info-bold w-5 h-5 text-gray-500 dark:text-gray-500 mt-0.5 shrink-0" />
                <p>
                  Use this guide for connecting{' '}
                  <img
                    style={{ height: '3.2em', verticalAlign: 'middle', display: 'inline-block' }}
                    src="/hacking/logo-light-styled.png"
                    alt="Logo"
                  />{' '}
                  to your codebase.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="relative pb-12">
              <div className="absolute -left-[56px] top-1 w-8 h-8 rounded-full bg-white dark:bg-[#111114] flex items-center justify-center shadow-sm ring-4 ring-white dark:ring-[#111114] border border-gray-200 dark:border-gray-700 z-10 overflow-hidden">
                <img src={activeFramework.logo} alt={activeFramework.name} className="w-5 h-5 object-contain" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Install the SDK
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-2xl">
                Run the following command to install the official falbor package in your project.
              </p>

              <div className="bg-[#262626] dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm p-2">
                <CodeBlock code="npm install falbor-stayup-sdk" language="bash" className="!bg-transparent !border-none !shadow-none" disableCopy={true} />
              </div>
            </div>
            <div className="relative pb-12">
              <div className="absolute -left-[56px] top-1 w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center text-sm font-bold shadow-md ring-4 ring-white dark:ring-[#111114] z-10">
                2
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Initialize the Client
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-2xl">
                Set your Project ID and API Key, and initialize the telemetry client. We recommend doing this in a dedicated configuration file (e.g., \`lib/falbor.ts\`).
              </p>

              <div className="bg-[#262626] dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm p-2">
                <CodeBlock
                  code={`import stayup from 'falbor-stayup-sdk';\n\nexport const falborClient = stayup.init({\n  projectId: '${selectedProject?.id || 'YOUR_PROJECT_ID'}',\n  apiKey: '${selectedProject?.apiKey || 'YOUR_API_KEY'}',\n  environment: 'development'\n});`}
                  language="javascript"
                  className="!bg-transparent !border-none !shadow-none"
                  disableCopy={true}
                />
              </div>
            </div>
            <div className="relative pb-12">
              <div className="absolute -left-[56px] top-1 w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center text-sm font-bold shadow-md ring-4 ring-white dark:ring-[#111114] z-10">
                3
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Wrap your Application
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-2xl">
                Finally, wrap your root layout or application entry point with the StayUp Provider to enable real-time tracking across your entire app.
              </p>

              <div className="bg-[#262626] dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm p-2">
                <CodeBlock
                  code={`import { falborClient } from '@/lib/falbor';\nimport { StayUpProvider } from 'falbor-stayup-sdk/react';\n\nexport default function RootLayout({ children }) {\n  return (\n    <StayUpProvider client={falborClient}>\n      {children}\n    </StayUpProvider>\n  );\n}`}
                  language="tsx"
                  className="!bg-transparent !border-none !shadow-none"
                  disableCopy={true}
                />
              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-[56px] top-1 w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center text-sm font-bold shadow-md ring-4 ring-white dark:ring-[#111114] z-10">
                4
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Run your app
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed max-w-2xl">
                Start your dev server, then visit <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">http://localhost:3000</code> to verify the connection.
              </p>

              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
                <div className="i-ph:info-bold w-5 h-5 text-gray-500 dark:text-gray-500 mt-0.5 shrink-0" />
                <p>
                  Use this guide for connecting{' '}
                  <img
                    style={{ height: '3.2em', verticalAlign: 'middle', display: 'inline-block' }}
                    src="/hacking/logo-light-styled.png"
                    alt="Logo"
                  />{' '}
                  to your codebase.
                </p>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
