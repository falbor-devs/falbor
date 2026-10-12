import * as Popover from '@radix-ui/react-popover';
import type { PropsWithChildren, ReactNode } from 'react';

export default ({
  children,
  trigger,
  side,
  align,
}: PropsWithChildren<{
  trigger: ReactNode;
  side: 'top' | 'right' | 'bottom' | 'left' | undefined;
  align: 'center' | 'start' | 'end' | undefined;
}>) => (
  <Popover.Root>
    <Popover.Trigger asChild>{trigger}</Popover.Trigger>
    <Popover.Anchor />
    <Popover.Portal>
      <Popover.Content
        sideOffset={10}
        side={side}
        align={align}
        className="bg-[#F9F6F9] text-falbor-elements-item-contentAccent rounded-md border z-workbench overflow-hidden"
      >
        {children}
        <Popover.Arrow className="fill-[#F9F6F9]" />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);