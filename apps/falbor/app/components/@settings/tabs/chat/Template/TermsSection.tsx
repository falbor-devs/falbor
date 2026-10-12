import React from 'react';
import { Checkbox, Label } from '~/components/ui';

interface TermsSectionProps {
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
}

export function TermsSection({ termsAccepted, setTermsAccepted }: TermsSectionProps) {
  return (
    <div className="flex flex-col gap-4 bg-[#F3F0F5] dark:bg-[#111] p-4 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Publishing Terms</h3>
      
      <p className="text-xs text-gray-600 dark:text-gray-400">
        By publishing this template, you agree to make the source code and configuration 
        available to the Falbor community. You represent that you have the right to share 
        this code and that it does not contain sensitive API keys or personal information.
      </p>

      <div className="flex items-start gap-3 mt-2">
        <Checkbox
          id="terms"
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
        />
        
        <Label htmlFor="terms" className="text-sm cursor-pointer select-none -mt-0.5">
          I agree to the publishing terms and confirm my code contains no sensitive secrets.
        </Label>
      </div>
    </div>
  );
}
