import React from 'react';

export function AcquisitionFunnelTab({ data }: { data: any }) {
  if (!data?.acquisitionFunnel) {
    return <div className="text-gray-500">No acquisition funnel data available.</div>;
  }

  const funnel = data.acquisitionFunnel;

  const Step = ({ number, title, tactic, description, color, icon }: any) => (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg z-10 ${color}`}>
          <i className={`${icon} text-lg`} />
        </div>
        {number !== 3 && (
          <div className="w-[2px] h-full bg-gray-200 dark:bg-gray-800 -my-2 group-hover:bg-blue-300 dark:group-hover:bg-blue-700 transition-colors" />
        )}
      </div>
      <div className="pb-8 pt-1 flex-1">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Step {number}: {title}</div>
        <div className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
          <h4 className="font-bold text-gray-900 dark:text-white text-base mb-2">{tactic}</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Acquisition Funnel</h3>
        <p className="text-gray-500 text-sm">Your most likely path to user growth, mapped end-to-end.</p>
      </div>

      <div className="flex flex-col mt-2 pl-2">
        <Step 
          number={1} 
          title="Top of Funnel" 
          tactic={funnel.topOfFunnel.tactic} 
          description={funnel.topOfFunnel.description}
          color="bg-blue-500"
          icon="i-ph:magnet-fill"
        />
        <Step 
          number={2} 
          title="Activation" 
          tactic={funnel.activation.tactic} 
          description={funnel.activation.description}
          color="bg-purple-500"
          icon="i-ph:lightning-fill"
        />
        <Step 
          number={3} 
          title="Retention & Referral" 
          tactic={funnel.retention.tactic} 
          description={funnel.retention.description}
          color="bg-green-500"
          icon="i-ph:recycle-fill"
        />
      </div>
    </div>
  );
}
