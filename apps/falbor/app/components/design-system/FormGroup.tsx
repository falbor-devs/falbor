import React from 'react';

interface FormGroupProps {
  label: string;
  children: React.ReactNode;
}

export const FormGroup: React.FC<FormGroupProps> = ({ label, children }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className="text-xs font-medium text-falbor-elements-textSecondary">{label}</label>
    {children}
  </div>
);
