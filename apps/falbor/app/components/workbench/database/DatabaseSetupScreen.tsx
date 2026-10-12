'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';

interface DatabaseSetupScreenProps {
  onConnectSupabase: () => void;
  onCreateDatabase: () => void;
}

export function DatabaseSetupScreen({ onConnectSupabase, onCreateDatabase }: DatabaseSetupScreenProps) {
  return (
    <div className="relative bg-[#FBFAFC] dark:bg-[#0B0B0B] flex flex-col lg:flex-row items-center justify-center gap-12 h-full p-8 text-center overflow-hidden">
      <div className="hidden lg:flex flex-1 max-w-2xl w-full items-center justify-center relative z-10">
        {}
        <img src="/background/database/image-database-setup-light.png" alt="Database Setup" className="w-full h-auto object-contain dark:hidden" />
        <img src="/background/database/image-database-setup-dark.png" alt="Database Setup" className="w-full h-auto object-contain hidden dark:block" />
      </div>

      <Card className="max-w-md w-full border-falbor-elements-borderColor shadow-none !rounded-[13px] relative z-10">
        <CardHeader className="text-center pb-0">
          <CardTitle>Power up your backend</CardTitle>
          <CardDescription className="mt-2">
            Ask Falbor to create a database to unlock these services.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-14 pb-16">
          <div className="flex flex-col gap-4">
            <Button
              size="lg"
              onClick={onConnectSupabase}
              className="w-full flex items-center justify-center gap-2 bg-[#252525] dark:bg-[#0aa06c] hover:bg-transparent dark:hover:bg-[#0aa06c] text-white"
            >
              <img
                height="16"
                width="16"
                crossOrigin="anonymous"
                src="https://cdn.simpleicons.org/supabase/white"
                alt="Supabase"
                className="opacity-90"
              />
              Connect to Supabase
            </Button>
            <Button
              size="lg"
              onClick={onCreateDatabase}
              className="w-full flex items-center justify-center gap-2 border border-[#171717] bg-[#FAFAFA] text-black dark:text-white dark:bg-[#171717] hover:bg-accent-600"
            >
              <div className="i-ph:magic-wand-duotone text-lg" />
              Ask Falbor to create a database
            </Button>
            <span className='dark:text-white'>More special thing will be available soon........</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
