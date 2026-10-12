import { memo } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { classNames } from '~/utils/classNames';

interface SwitchProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (event: boolean) => void;
  disabled?: boolean;
}

export const Switch = memo(({ className, onCheckedChange, checked, disabled }: SwitchProps) => {
  return (
    <SwitchPrimitive.Root
      disabled={disabled}
      className={classNames(
        'relative h-5 w-9 cursor-pointer rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=unchecked]:bg-[#E0DDE0]',
        'data-[state=checked]:bg-[#0099ff]',
        className,
      )}
      checked={checked}
      onCheckedChange={(e) => onCheckedChange?.(e)}
    >
      <SwitchPrimitive.Thumb
        className={classNames(
          'block h-4 w-4 rounded-full bg-white',
          'shadow-lg shadow-black/20',
          'transition-transform duration-200 ease-in-out',
          'translate-x-0.5',
          'data-[state=checked]:translate-x-[1.125rem]',
          'will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
});