import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { type ReactNode } from 'react';
import { classNames } from '~/utils/classNames';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  className?: string;
}

interface DropdownItemProps {
  children: ReactNode;
  onSelect?: (e: Event) => void;
  className?: string;
  asChild?: boolean;
  active?: boolean;
  disabled?: boolean;
}

export const DropdownItem = ({ children, onSelect, className, asChild, active, disabled }: DropdownItemProps) => (
  <DropdownMenu.Item
    disabled={disabled}
    className={classNames(
      'relative flex items-center gap-2 px-1.5 py-1 rounded-md text-sm',
      'text-falbor-elements-textPrimary',
      'focus:bg-[#E3E3E3] dark:focus:bg-[#2A2A2A] hover:bg-[#E3E3E3] dark:hover:bg-[#2A2A2A]',
      'cursor-default',
      disabled && 'opacity-50 pointer-events-none',
      active && 'bg-[#E3E3E3] dark:bg-[#2A2A2A]', 
      className,
    )}
    onSelect={onSelect}
    asChild={asChild}
  >
    {children}
  </DropdownMenu.Item>
);

export const DropdownSeparator = () => <DropdownMenu.Separator className="h-px bg-[#D6D6D6] dark:bg-[#353538] my-1 mx-2" />;

export const Dropdown = ({ trigger, children, align = 'end', side, sideOffset = 5, className }: DropdownProps) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          style={{ boxShadow: '0px 0px 5px #b3b1b1ff' }}
          className={classNames(
            'min-w-[160px] rounded-lg p-1',
            'bg-white dark:bg-[#141414]',
            'border border-[#D6D6D6] dark:border-[#353538]',
            'shadow-lg',
            'radix-dropdown-content',
            'data-[side=bottom]:slide-in-from-top-2',
            'data-[side=left]:slide-in-from-right-2',
            'data-[side=right]:slide-in-from-left-2',
            'data-[side=top]:slide-in-from-bottom-2',
            'z-[99999]',
            className,
          )}
          side={side}
          sideOffset={sideOffset}
          align={align}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export const DropdownSub = DropdownMenu.Sub;

interface DropdownSubTriggerProps {
  children: ReactNode;
  className?: string;
}

export const DropdownSubTrigger = ({ children, className }: DropdownSubTriggerProps) => (
  <DropdownMenu.SubTrigger
    className={classNames(
      'relative flex items-center justify-between gap-2 px-1.5 py-1 rounded-md text-sm',
      'text-falbor-elements-textPrimary',
      'focus:bg-[#E3E3E3] dark:focus:bg-[#2A2A2A] data-[state=open]:bg-[#E3E3E3] dark:data-[state=open]:bg-[#2A2A2A] hover:bg-[#E3E3E3] dark:hover:bg-[#2A2A2A]',
      'cursor-default outline-none',
      className,
    )}
  >
    <div className="flex items-center gap-2">{children}</div>
    <div className="i-ph:caret-right text-xs text-falbor-elements-textSecondary ml-auto" />
  </DropdownMenu.SubTrigger>
);

interface DropdownSubContentProps {
  children: ReactNode;
  className?: string;
  alignOffset?: number;
}

export const DropdownSubContent = ({ children, className, alignOffset }: DropdownSubContentProps) => (
  <DropdownMenu.Portal>
    <DropdownMenu.SubContent
      style={{ boxShadow: '0px 0px 5px #b3b1b1ff' }}
      className={classNames(
        'min-w-[160px] rounded-lg p-1',
        'bg-white dark:bg-[#141414]',
        'border border-[#D6D6D6] dark:border-[#353538]',
        'shadow-lg',
        'radix-dropdown-content',
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        'z-[1000]',
        className,
      )}
      sideOffset={5}
      alignOffset={alignOffset}
    >
      {children}
    </DropdownMenu.SubContent>
  </DropdownMenu.Portal>
);