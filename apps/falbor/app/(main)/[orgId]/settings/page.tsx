import React from 'react';
import { SDKSetupView } from '~/components/stayup/SDKSetupView';

export default function SettingsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-falbor-elements-textPrimary">SDK Setup & Settings</h1>
        <p className="text-falbor-elements-textSecondary mt-1">Connect your applications to StayUp to start monitoring.</p>
      </div>
      
      <SDKSetupView />
    </div>
  );
}
