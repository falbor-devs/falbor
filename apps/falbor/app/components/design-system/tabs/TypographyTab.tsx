import React from 'react';
import { Input } from '~/components/ui/Input';
import { FormGroup } from '../FormGroup';

const FONTS = ['Inter', 'Roboto', 'Outfit', 'Playfair Display', 'Montserrat', 'Open Sans', 'Lato'];

interface TypographyTabProps {
  styles: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}

export const TypographyTab: React.FC<TypographyTabProps> = ({ styles, handleChange }) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      <FormGroup label="Font Family">
        <select 
          value={styles.fontFamily}
          onChange={(e) => handleChange('fontFamily', e.target.value)}
          className="w-full bg-transparent border border-falbor-elements-borderColor rounded-md p-2 text-sm"
        >
          <option value="">Default</option>
          {FONTS.map(font => (
            <option key={font} value={`'${font}', sans-serif`}>{font}</option>
          ))}
        </select>
      </FormGroup>
      
      <FormGroup label="Font Size">
        <div className="flex items-center gap-2">
          <Input 
            value={styles.fontSize.replace('px', '').replace('rem', '')} 
            onChange={(e) => handleChange('fontSize', e.target.value ? `${e.target.value}px` : '')}
            placeholder="e.g. 16"
            type="number"
          />
          <span className="text-sm text-falbor-elements-textSecondary">px</span>
        </div>
      </FormGroup>

      <FormGroup label="Font Weight">
        <div className="flex bg-falbor-elements-background-depth-2 rounded-lg p-1 border border-falbor-elements-borderColor">
          {['normal', '500', 'bold', '900'].map(weight => (
            <button
              key={weight}
              onClick={() => handleChange('fontWeight', weight)}
              className={`flex-1 py-1 text-sm rounded-md transition-colors ${styles.fontWeight === weight ? 'bg-accent-500 text-white shadow-sm' : 'hover:bg-falbor-elements-background-depth-3'}`}
            >
              {weight === '500' ? 'Medium' : weight === '900' ? 'Black' : weight.charAt(0).toUpperCase() + weight.slice(1)}
            </button>
          ))}
        </div>
      </FormGroup>

      <FormGroup label="Text Align">
        <div className="flex gap-2 bg-falbor-elements-background-depth-2 rounded-lg p-1 border border-falbor-elements-borderColor w-fit">
          {['left', 'center', 'right', 'justify'].map(align => (
            <button
              key={align}
              onClick={() => handleChange('textAlign', align)}
              className={`p-2 rounded-md transition-colors ${styles.textAlign === align ? 'bg-accent-500 text-white shadow-sm' : 'hover:bg-falbor-elements-background-depth-3'}`}
            >
              <div className={`i-ph:text-align-${align} text-lg`} />
            </button>
          ))}
        </div>
      </FormGroup>
    </div>
  );
};
