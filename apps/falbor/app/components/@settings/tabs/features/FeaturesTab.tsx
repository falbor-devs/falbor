'use client';
import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '~/components/ui/Switch';
import { useSettings } from '~/lib/hooks/useSettings';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';
import { PromptLibrary } from '~/lib/common/prompt-library';

interface FeatureToggle {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  beta?: boolean;
  experimental?: boolean;
  tooltip?: string;
}

const FeatureCard = memo(
  ({
    feature,
    index,
    onToggle,
  }: {
    feature: FeatureToggle;
    index: number;
    onToggle: (id: string, enabled: boolean) => void;
  }) => (
    <motion.div
      key={feature.id}
      layoutId={feature.id}
      className={classNames(
        'relative group cursor-pointer border border-falbor-elements-borderColor',
        'bg-falbor-elements-background-depth-1',
        'hover:bg-falbor-elements-background-depth-2',
        'transition-colors duration-200',
        'rounded-xl overflow-hidden',
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="p-5 flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center gap-2">
            <div className={classNames(feature.icon, 'w-5 h-5 text-purple-500')} />
            <h3 className="font-medium text-[15px] text-falbor-elements-textPrimary">{feature.title}</h3>
            {feature.beta && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-500 font-medium">Beta</span>
            )}
            {feature.experimental && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/10 text-orange-500 font-medium">
                Experimental
              </span>
            )}
          </div>
          <p className="text-sm text-falbor-elements-textSecondary leading-relaxed">{feature.description}</p>
          {feature.tooltip && <p className="mt-1 text-xs text-falbor-elements-textTertiary">{feature.tooltip}</p>}
        </div>
        <div className="pt-1 shrink-0">
          <Switch checked={feature.enabled} onCheckedChange={(checked) => onToggle(feature.id, checked)} />
        </div>
      </div>
    </motion.div>
  ),
);

export default function FeaturesTab() {
  const {
    autoSelectTemplate,
    isLatestBranch,
    contextOptimizationEnabled,
    eventLogs,
    setAutoSelectTemplate,
    enableLatestBranch,
    enableContextOptimization,
    setEventLogs,
    setPromptId,
    promptId,
    dynamicReasoningEnabled,
    enableDynamicReasoning,
    imageGenerationEnabled,
    enableImageGeneration,
  } = useSettings();

  
  React.useEffect(() => {
    if (isLatestBranch === undefined) enableLatestBranch(false);
    if (contextOptimizationEnabled === undefined) enableContextOptimization(true);
    if (autoSelectTemplate === undefined) setAutoSelectTemplate(true);
    if (promptId === undefined) setPromptId('default');
    if (eventLogs === undefined) setEventLogs(true);
  }, []);

  const handleToggleFeature = useCallback(
    (id: string, enabled: boolean) => {
      switch (id) {
        case 'latestBranch':
          enableLatestBranch(enabled);
          toast.success(`Main branch updates ${enabled ? 'enabled' : 'disabled'}`);
          break;
        case 'autoSelectTemplate':
          setAutoSelectTemplate(enabled);
          toast.success(`Auto select template ${enabled ? 'enabled' : 'disabled'}`);
          break;
        case 'contextOptimization':
          enableContextOptimization(enabled);
          toast.success(`Context optimization ${enabled ? 'enabled' : 'disabled'}`);
          break;
        case 'eventLogs':
          setEventLogs(enabled);
          toast.success(`Event logging ${enabled ? 'enabled' : 'disabled'}`);
          break;
        default:
          break;
      }
    },
    [enableLatestBranch, setAutoSelectTemplate, enableContextOptimization, setEventLogs],
  );

  const handleToggleDynamicReasoning = useCallback((checked: boolean) => {
    enableDynamicReasoning(checked);
    toast[checked ? 'success' : 'info'](`Dynamic Reasoning ${checked ? 'enabled' : 'disabled'}`);
  }, [enableDynamicReasoning]);

  const handleToggleImageGeneration = useCallback((checked: boolean) => {
    enableImageGeneration(checked);
    toast[checked ? 'success' : 'info'](`Image Generation ${checked ? 'enabled' : 'disabled'}`);
  }, [enableImageGeneration]);

  const features: FeatureToggle[] = [
    {
      id: 'latestBranch',
      title: 'Main Branch Updates',
      description: 'Get the latest updates from the main branch',
      icon: 'i-ph:git-branch',
      enabled: isLatestBranch,
      tooltip: 'Enabled by default to receive updates from the main development branch',
    },
    {
      id: 'autoSelectTemplate',
      title: 'Auto Select Template',
      description: 'Automatically select starter template',
      icon: 'i-ph:selection',
      enabled: autoSelectTemplate,
      tooltip: 'Enabled by default to automatically select the most appropriate starter template',
    },
    {
      id: 'contextOptimization',
      title: 'Context Optimization',
      description: 'Optimize context for better responses',
      icon: 'i-ph:brain',
      enabled: contextOptimizationEnabled,
      tooltip: 'Enabled by default for improved AI responses',
    },
    {
      id: 'eventLogs',
      title: 'Event Logging',
      description: 'Enable detailed event logging and history',
      icon: 'i-ph:list-bullets',
      enabled: eventLogs,
      tooltip: 'Enabled by default to record detailed logs of system events and user actions',
    },
  ];

  return (
    <div className="flex flex-col gap-10 w-full max-w-4xl mx-auto p-4 md:p-6 text-falbor-elements-textPrimary">
      {}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <div className="i-ph:sparkle text-purple-500" />
            Add-on features
          </h2>
          <p className="text-sm text-falbor-elements-textSecondary">
            Turn on the features that fit your workflow. Add-on features are only available on paid plans.
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-500/10 border-l-2 border-orange-500 p-4 rounded-sm text-sm text-orange-800 dark:text-orange-200">
          Some of the features available on paid plans.  <button 
            className="text-blue-500 hover:underline"
            onClick={() => {
              import('~/lib/stores/settings').then(({ settingsTabStore, blinkPricingStore }) => {
                settingsTabStore.set('pricing');
                blinkPricingStore.set(true);
                setTimeout(() => blinkPricingStore.set(false), 2000);
              });
            }}
          >Upgrade</button> to a paid account to get access.
        </div>

        {}
        <motion.div
          layout
          className={classNames(
            'border border-falbor-elements-borderColor rounded-xl overflow-hidden',
            'bg-falbor-elements-background-depth-1'
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {}
          <div className="p-5 flex items-start justify-between gap-6 border-b border-falbor-elements-borderColor">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="i-ph:brain text-xl text-purple-500" />
                <h3 className="font-medium text-[15px]">Dynamic Reasoning</h3>
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-500 font-medium">Premium</span>
              </div>
              <p className="text-sm text-falbor-elements-textSecondary leading-relaxed">
                Improves results on complex problems by using deeper reasoning. May result in longer response times or higher token use.
              </p>
            </div>
            <div className="pt-1 shrink-0">
              <Switch
                checked={dynamicReasoningEnabled}
                onCheckedChange={handleToggleDynamicReasoning}
              />
            </div>
          </div>

          {}
          <div className="p-5 flex items-start justify-between gap-6 border-b border-falbor-elements-borderColor">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="i-ph:image text-xl text-purple-500" />
                <h3 className="font-medium text-[15px]">Image Generation</h3>
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-500 font-medium">Coming Soon</span>
              </div>
              <p className="text-sm text-falbor-elements-textSecondary leading-relaxed">
                Generates images from text prompts within your conversation. Each image uses tokens from your allocation.{' '}
                <a href="#" className="text-blue-500 hover:underline">Learn how to generate images.</a>
              </p>
            </div>
            <div className="pt-1 shrink-0">
              <Switch
                checked={imageGenerationEnabled}
                onCheckedChange={handleToggleImageGeneration}
                disabled
              />
            </div>
          </div>

          {}
          {features.map((feature, index) => (
            <div key={feature.id} className={classNames(
              "p-5 flex items-start justify-between gap-6",
              index !== features.length - 1 ? "border-b border-falbor-elements-borderColor" : ""
            )}>
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className={classNames(feature.icon, 'w-5 h-5 text-purple-500')} />
                  <h3 className="font-medium text-[15px] text-falbor-elements-textPrimary">{feature.title}</h3>
                  {feature.beta && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-500 font-medium">Beta</span>
                  )}
                  {feature.experimental && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/10 text-orange-500 font-medium">
                      Experimental
                    </span>
                  )}
                </div>
                <p className="text-sm text-falbor-elements-textSecondary leading-relaxed">{feature.description}</p>
                {feature.tooltip && <p className="mt-1 text-xs text-falbor-elements-textTertiary">{feature.tooltip}</p>}
              </div>
              <div className="pt-1 shrink-0">
                <Switch checked={feature.enabled} onCheckedChange={(checked) => handleToggleFeature(feature.id, checked)} />
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {}
      <motion.div
        layout
        className={classNames(
          'bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor',
          'hover:bg-falbor-elements-background-depth-2',
          'transition-all duration-200',
          'rounded-xl p-5',
          'group',
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg text-xl bg-falbor-elements-background-depth-3 group-hover:bg-falbor-elements-background-depth-4 transition-colors duration-200 text-purple-500">
            <div className="i-ph:book" />
          </div>
          <div className="flex-1">
            <h4 className="text-[15px] font-medium text-falbor-elements-textPrimary group-hover:text-purple-500 transition-colors">
              Prompt Library
            </h4>
            <p className="text-sm text-falbor-elements-textSecondary mt-0.5">
              Choose a prompt from the library to use as the system prompt
            </p>
          </div>
          <select
            value={promptId}
            onChange={(e) => {
              setPromptId(e.target.value);
              toast.success('Prompt template updated');
            }}
            className={classNames(
              'p-2 rounded-lg text-sm min-w-[200px]',
              'bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor',
              'text-falbor-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'group-hover:border-purple-500/30',
              'transition-all duration-200',
            )}
          >
            {PromptLibrary.getList().map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>
    </div>
  );
}
