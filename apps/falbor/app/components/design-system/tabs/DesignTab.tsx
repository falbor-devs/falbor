import React from 'react';
import { Input } from '~/components/ui/Input';
import { FormGroup } from '../FormGroup';

interface DesignTabProps {
  styles: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}

export const DesignTab: React.FC<DesignTabProps> = ({ styles, handleChange }) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      <FormGroup label="Background Color">
        <div className="flex gap-2 items-center">
          <input 
            type="color" 
            value={styles.backgroundColor || '#ffffff'} 
            onChange={(e) => handleChange('backgroundColor', e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0"
          />
          <Input 
            value={styles.backgroundColor} 
            onChange={(e) => handleChange('backgroundColor', e.target.value)}
            placeholder="#ffffff or transparent"
          />
        </div>
      </FormGroup>

      <FormGroup label="Text Color">
        <div className="flex gap-2 items-center">
          <input 
            type="color" 
            value={styles.color || '#000000'} 
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0"
          />
          <Input 
            value={styles.color} 
            onChange={(e) => handleChange('color', e.target.value)}
            placeholder="#000000"
          />
        </div>
      </FormGroup>

      <FormGroup label="Border Radius">
        <div className="flex items-center gap-2">
          <Input 
            value={styles.borderRadius.replace('px', '').replace('rem', '')} 
            onChange={(e) => handleChange('borderRadius', e.target.value ? `${e.target.value}px` : '')}
            placeholder="e.g. 8"
            type="number"
          />
          <span className="text-sm text-falbor-elements-textSecondary">px</span>
        </div>
      </FormGroup>

      <FormGroup label="Border">
        <Input 
          value={styles.border} 
          onChange={(e) => handleChange('border', e.target.value)}
          placeholder="e.g. 1px solid #000"
        />
      </FormGroup>
    </div>
  );
};
