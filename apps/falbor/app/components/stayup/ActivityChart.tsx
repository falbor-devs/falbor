'use client';
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ActivityChart({ events = [] }: { events?: any[] }) {
  
  const chartData = useMemo(() => {
    const data: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        fullDate: d.getTime(),
        errors: 0
      });
    }

    
    events.forEach(event => {
      const eventDate = new Date(event.timestamp);
      eventDate.setHours(0, 0, 0, 0);
      const day = data.find(d => d.fullDate === eventDate.getTime());
      if (day) {
        day.errors += 1;
      }
    });

    
    return data.map((d) => ({
      name: d.date.split(',')[0], 
      fullDateStr: d.date,
      errors: d.errors
    }));
  }, [events]);

  return (
    <div className="w-full mt-6 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/20 backdrop-blur-sm p-6 shadow-sm relative overflow-hidden">
      {}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="flex items-end justify-between mb-8 relative z-10">
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <div className="i-ph:activity-duotone w-6 h-6 text-indigo-500" />
            Activity Overview
          </h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tracked events across all instances (Last 7 Days)</p>
        </div>
      </div>
      
      <div className="w-full h-[320px] relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#9ca3af" opacity={0.15} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 13, fill: '#9ca3af', fontWeight: 500 }}
              dy={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 13, fill: '#9ca3af', fontWeight: 500 }}
              dx={-10}
              allowDecimals={false}
            />
            <Tooltip 
              cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-xl p-3 px-4 backdrop-blur-md">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                        {payload[0].payload.fullDateStr}
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                        {payload[0].value} {payload[0].value === 1 ? 'Error' : 'Errors'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="errors" 
              stroke="#6366f1" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorErrors)" 
              animationDuration={1500}
              activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2, className: 'shadow-[0_0_12px_rgba(99,102,241,0.8)]' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
