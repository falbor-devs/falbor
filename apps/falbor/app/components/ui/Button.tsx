import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { classNames } from '~/utils/classNames';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-falbor-elements-borderColor disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-falbor-elements-background text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-2',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline:
          'border border-falbor-elements-borderColor bg-transparent hover:bg-falbor-elements-background-depth-2 hover:text-falbor-elements-textPrimary text-falbor-elements-textPrimary dark:border-falbor-elements-borderColorActive',
        secondary:
          'bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-2',
        ghost: 'hover:bg-falbor-elements-background-depth-1 hover:text-falbor-elements-textPrimary',
        link: 'text-falbor-elements-textPrimary underline-offset-4 hover:underline',
      },
      size: {
        xs: 'h-6 px-2 text-[10px] rounded-md',
        sm: 'h-7 px-2.5 text-xs rounded-md',
        default: 'h-8 px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  _asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, _asChild = false, ...props }, ref) => {
    return <button className={classNames(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
