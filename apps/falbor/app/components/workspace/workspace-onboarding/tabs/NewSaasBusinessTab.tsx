'use client';

interface NewSaasBusinessTabProps {
  goal: string;
  setGoal: (goal: string) => void;
}

const examples = [
  'Help independent fitness coaches manage clients and recurring payments.',
  'Build a simple analytics product for small ecommerce teams.',
  'Create a workflow tool for agencies that manage social media clients.',
];

export function NewSaasBusinessTab({ goal, setGoal }: NewSaasBusinessTabProps) {
  return (
    <div className="flex h-full min-h-[700px] flex-col bg-gray-50 p-8 dark:bg-[#111114]">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
        <div className="mb-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0099ff]/10 text-2xl text-[#0099ff]">
            <div className="i-ph:rocket-launch" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">What SaaS business do you want to build?</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Describe the customer, problem, or direction you have in mind. Falbor will research the opportunity and propose a business concept for your approval.
          </p>
        </div>

        <label className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200" htmlFor="saas-business-goal">
          Your goal
        </label>
        <textarea
          id="saas-business-goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          placeholder="For example: I want to build a SaaS product that helps..."
          className="min-h-36 w-full resize-none rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#0099ff] dark:border-[#353538] dark:bg-[#1C1D21] dark:text-white dark:placeholder:text-gray-500"
          maxLength={2000}
        />

        <div className="mt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Examples</p>
          <div className="flex flex-col gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setGoal(example)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-600 transition-colors hover:border-[#0099ff]/50 hover:text-gray-900 dark:border-[#353538] dark:bg-[#1C1D21] dark:text-gray-400 dark:hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
