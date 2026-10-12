import React from 'react';

export function CompetitorMatrixTab({ data }: { data: any }) {
  if (!data?.competitorMatrix || data.competitorMatrix.length === 0) {
    return <div className="text-gray-500">No competitor matrix data available.</div>;
  }

  const xAxis = data.competitorMatrix[0]?.xAxisLabel || 'Niche -> Broad';
  const yAxis = data.competitorMatrix[0]?.yAxisLabel || 'Low Price -> Premium';

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Competitor Matrix</h3>
        <p className="text-gray-500 text-sm">Visualizing your position in the market.</p>
      </div>

      <div className="relative w-full aspect-square max-h-[400px] border-2 border-gray-200 dark:border-gray-800 rounded-lg mx-auto bg-gray-50 dark:bg-[#1C1D21] p-4">
        {/* Axes */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-300 dark:bg-gray-700 -translate-y-1/2" />
        <div className="absolute top-0 left-1/2 w-[2px] h-full bg-gray-300 dark:bg-gray-700 -translate-x-1/2" />
        
        {/* Labels */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-[#1C1D21] px-2 rounded-full">{yAxis.split('->')[1] || 'High'}</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-[#1C1D21] px-2 rounded-full">{yAxis.split('->')[0] || 'Low'}</div>
        <div className="absolute top-1/2 right-2 -translate-y-1/2 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-[#1C1D21] px-2 rounded-full">{xAxis.split('->')[1] || 'High'}</div>
        <div className="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-[#1C1D21] px-2 rounded-full">{xAxis.split('->')[0] || 'Low'}</div>

        {/* Data points */}
        {data.competitorMatrix.map((comp: any, idx: number) => {
          const left = `${comp.xScore * 10}%`;
          const bottom = `${comp.yScore * 10}%`;
          const isYou = comp.name.toLowerCase() === 'you' || comp.name.toLowerCase().includes('your');
          
          return (
            <div 
              key={idx} 
              className="absolute w-4 h-4 -ml-2 mb-2 rounded-full shadow-md flex items-center justify-center cursor-pointer group"
              style={{ left, bottom, backgroundColor: isYou ? '#0099ff' : '#6b7280' }}
            >
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                {comp.name}
              </div>
              {isYou && <div className="absolute w-8 h-8 rounded-full bg-[#0099ff] opacity-20 animate-ping" />}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Key Takeaway</h4>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm leading-relaxed border border-blue-100 dark:border-blue-800/30">
          Your blue ocean opportunity lies in positioning yourself uniquely away from the cluster of competitors shown above. Use this to refine your messaging.
        </div>
      </div>
    </div>
  );
}
