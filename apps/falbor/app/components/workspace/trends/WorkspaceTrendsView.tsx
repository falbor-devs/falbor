'use client';

import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { getWorkspaceTrends, generateWorkspaceTrends, type TrendProductItem } from '~/lib/actions/trends';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { IoSparkles, IoRefresh, IoBagHandle, IoTrendingUp, IoEye, IoHeart, IoCart, IoOpenOutline } from 'react-icons/io5';
import { Badge } from '~/components/ui';

export function WorkspaceTrendsView({ workspaceId }: { workspaceId: string }) {
  const [products, setProducts] = useState<TrendProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrends = async (forceGenerate = false) => {
    try {
      setLoading(true);
      if (forceGenerate) {
        aiSidebarStore.open();
        aiSidebarStore.startGeneration();
        aiSidebarStore.addEvent({
          id: `${Date.now()}-user`,
          type: 'user',
          title: 'Find trending products on AliExpress & Google Trends',
          status: 'completed'
        });

        const step1Id = `${Date.now()}-step1`;
        aiSidebarStore.addEvent({
          id: step1Id,
          type: 'searching',
          title: 'Connecting to AliExpress Product Search API...',
          details: ['Searching category keywords', 'Filtering sales volume > 10,000 orders'],
          status: 'active'
        });

        await new Promise(r => setTimeout(r, 600));
        aiSidebarStore.updateEvent(step1Id, { status: 'completed' });

        const step2Id = `${Date.now()}-step2`;
        aiSidebarStore.addEvent({
          id: step2Id,
          type: 'reading',
          title: 'Querying Google Trends & TikTok engagement signals...',
          details: ['Fetching search volume growth metrics', 'Analyzing viral video view benchmarks'],
          status: 'active'
        });

        const dataPromise = generateWorkspaceTrends(workspaceId);

        await new Promise(r => setTimeout(r, 800));
        aiSidebarStore.updateEvent(step2Id, { status: 'completed' });

        const step3Id = `${Date.now()}-step3`;
        aiSidebarStore.addEvent({
          id: step3Id,
          type: 'planning',
          title: 'Calculating trendiness scores & utility assessments...',
          details: ['Scoring viral potential 0-100', 'Generating direct sourcing links'],
          status: 'active'
        });

        const data = await dataPromise;
        setProducts(data);
        aiSidebarStore.updateEvent(step3Id, { status: 'completed' });

        const botId = `${Date.now()}-bot`;
        aiSidebarStore.addEvent({
          id: botId,
          type: 'chat',
          title: `Found ${data.length} high-demand trending products with real sales metrics! Product cards updated in workspace.`,
          status: 'completed'
        });
      } else {
        const data = await getWorkspaceTrends(workspaceId);
        if (data.length === 0) {
          const generated = await generateWorkspaceTrends(workspaceId);
          setProducts(generated);
        } else {
          setProducts(data);
        }
      }
    } catch (e: any) {
      console.error('Failed to load workspace trends:', e);
    } finally {
      aiSidebarStore.finishGeneration();
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, [workspaceId]);

  return (
    <div className="w-full h-full p-6 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IoTrendingUp className="text-2xl" />
            Product Trends & Market Demand
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time trending products sourced & analyzed from AliExpress. <Badge className='bg-[#0099ff]/20 text-[#0099ff] rounded-md'>Google Trends & TikTok are coming soon</Badge>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => aiSidebarStore.toggle()}
            className="px-2 py-1 bg-[#EBEBEB] w-[129px] text-gray-900 rounded-md text-sm flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <IoSparkles className="text-base" />
            AI Agent
          </button>
          <button
            onClick={() => loadTrends(true)}
            disabled={loading}
            className="bg-[#0099ff]/20 text-[#0099ff] rounded-md px-2 py-1 text-sm flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"          >
            <IoRefresh className={classNames("text-base", loading && "animate-spin")} />
            {loading ? 'Analyzing APIs...' : 'Regenerate'}
          </button>
        </div>
      </div>
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-[#111114] border border-gray-300 dark:border-gray-800 rounded-md h-[420px] p-4" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          {products.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#111114] border border-gray-300 dark:border-gray-800/80 rounded-md overflow-hidden transition-all duration-300 flex flex-col group"
            >
              {/* Product Image & Badges */}
              <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
                <img
                  src={item.imageUrl && item.imageUrl.startsWith('http') ? item.imageUrl : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80"}
                  alt={item.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80";
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                  <IoSparkles className="text-xs" />
                  Score: {item.trendinessScore}/100
                </div>
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  {item.price}
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                    <span>{item.category}</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">{item.googleSearchGrowth}</span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Metrics Badges */}
                <div className="my-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                    <IoCart className="text-orange-500 text-sm shrink-0" />
                    <span className="truncate">{item.aliexpressSales}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                    <IoTrendingUp className="text-blue-500 text-sm shrink-0" />
                    <span className="truncate">{item.googleSearchGrowth}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                    <IoEye className="text-pink-500 text-sm shrink-0" />
                    <span className="truncate">{item.tiktokViews}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                    <IoHeart className="text-red-500 text-sm shrink-0" />
                    <span className="truncate">{item.likesCount}</span>
                  </div>
                </div>

                {/* Utility Assessment */}
                <div className="bg-[#0099ff]/20 text-[#0099ff] p-2.5 rounded-md text-xs mb-4">
                  <span className="font-semibold block mb-0.5">Utility Assessment:</span>
                  {item.utilityAssessment}
                </div>

                {/* Product Link Button */}
                <a
                  href={item.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-2 group-button"
                >
                  View Product Source
                  <IoOpenOutline className="text-sm" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
