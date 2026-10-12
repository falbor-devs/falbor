import React from 'react';
import { Input } from '~/components/ui/Input';
import { FormGroup } from '../FormGroup';

interface LayoutTabProps {
  styles: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}

export const LayoutTab: React.FC<LayoutTabProps> = ({ styles, handleChange }) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      <FormGroup label="Padding">
        <Input 
          value={styles.padding} 
          onChange={(e) => handleChange('padding', e.target.value)}
          placeholder="e.g. 1rem 2rem or 16px"
        />
      </FormGroup>
      
      <FormGroup label="Margin">
        <Input 
          value={styles.margin} 
          onChange={(e) => handleChange('margin', e.target.value)}
          placeholder="e.g. 0 auto or 16px"
        />
      </FormGroup>
    </div>
  );
};
