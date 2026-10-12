'use client';
import * as RadixDialog from '@radix-ui/react-dialog';
import { motion, type Variants } from 'framer-motion';
import React, { memo, type ReactNode, useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { FixedSizeList } from 'react-window';
import { Checkbox } from './Checkbox';
import { Label } from './Label';

export { Close as DialogClose, Root as DialogRoot, Overlay as DialogOverlay, Content as DialogPanel } from '@radix-ui/react-dialog';

interface DialogButtonProps {
  type: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  disabled?: boolean;
}

export const DialogButton = memo(({ type, children, onClick, disabled }: DialogButtonProps) => {
  return (
    <button
      className={classNames(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors',
        type === 'primary'
          ? 'bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-500 dark:hover:bg-purple-600'
          : type === 'secondary'
            ? 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            : 'bg-transparent text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
});

export const DialogTitle = memo(({ className, children, ...props }: RadixDialog.DialogTitleProps) => {
  return (
    <RadixDialog.Title
      className={classNames('text-lg font-medium text-falbor-elements-textPrimary flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </RadixDialog.Title>
  );
});

export const DialogDescription = memo(({ className, children, ...props }: RadixDialog.DialogDescriptionProps) => {
  return (
    <RadixDialog.Description
      className={classNames('text-sm text-falbor-elements-textSecondary mt-1', className)}
      {...props}
    >
      {children}
    </RadixDialog.Description>
  );
});

const transition = {
  duration: 0.15,
  ease: cubicEasingFn,
};

export const dialogBackdropVariants = {
  closed: {
    opacity: 0,
    transition,
  },
  open: {
    opacity: 1,
    transition,
  },
} satisfies Variants;

export const dialogVariants = {
  closed: {
    x: '-50%',
    y: '-40%',
    scale: 0.96,
    opacity: 0,
    transition,
  },
  open: {
    x: '-50%',
    y: '-50%',
    scale: 1,
    opacity: 1,
    transition,
  },
} satisfies Variants;

interface DialogProps {
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  onBackdrop?: () => void;
}

export const Dialog = memo(({ children, className, showCloseButton = true, onClose, onBackdrop }: DialogProps) => {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay asChild>
        <motion.div
          className={classNames('fixed inset-0 z-[9999] bg-black/70 dark:bg-black/80 backdrop-blur-sm')}
          initial="closed"
          animate="open"
          exit="closed"
          variants={dialogBackdropVariants}
          onClick={onBackdrop}
        />
      </RadixDialog.Overlay>
      <RadixDialog.Content asChild>
        <motion.div
          className={classNames(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-950 rounded-lg shadow-xl border border-falbor-elements-borderColor z-[9999] w-[520px] focus:outline-none',
            className,
          )}
          initial="closed"
          animate="open"
          exit="closed"
          variants={dialogVariants}
        >
          <div className="flex flex-col h-full">
            {children}
            {showCloseButton && (
              <RadixDialog.Close asChild onClick={onClose}>
                <IconButton
                  icon="i-ph:x"
                  className="absolute top-3 right-3 text-falbor-elements-textTertiary hover:text-falbor-elements-textSecondary"
                />
              </RadixDialog.Close>
            )}
          </div>
        </motion.div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
});


export interface ConfirmationDialogProps {
  
  isOpen: boolean;

  
  onClose: () => void;

  
  onConfirm: () => void;

  
  title: string;

  
  description: string;

  
  confirmLabel?: string;

  
  cancelLabel?: string;

  
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

  
  isLoading?: boolean;
}


export function ConfirmationDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <RadixDialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog showCloseButton={false}>
        <div className="p-6 bg-white dark:bg-gray-950 relative z-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="mb-4">{description}</DialogDescription>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant}
              onClick={onConfirm}
              disabled={isLoading}
              className={
                variant === 'destructive'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-falbor-elements-item-backgroundAccent text-falbor-elements-item-contentAccent hover:bg-falbor-elements-button-primary-backgroundHover'
              }
            >
              {isLoading ? (
                <>
                  <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                  {confirmLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </RadixDialog.Root>
  );
}


type SelectionItem = {
  id: string;
  label: string;
  description?: string;
};


export interface SelectionDialogProps {
  
  title: string;

  
  items: SelectionItem[];

  
  isOpen: boolean;

  
  onClose: () => void;

  
  onConfirm: (selectedIds: string[]) => void;

  
  confirmLabel?: string;

  
  maxHeight?: string;
}


export function SelectionDialog({
  title,
  items,
  isOpen,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  maxHeight = '60vh',
}: SelectionDialogProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  
  useEffect(() => {
    if (isOpen) {
      setSelectedItems([]);
      setSelectAll(false);
    }
  }, [isOpen]);

  const handleToggleItem = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      setSelectedItems(items.map((item) => item.id));
      setSelectAll(true);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedItems);
    onClose();
  };

  
  const listHeight = Math.min(
    items.length * 60,
    parseInt(maxHeight.replace('vh', '')) * window.innerHeight * 0.01 - 40,
  );

  
  const ItemRenderer = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    return (
      <div
        key={item.id}
        className={classNames(
          'flex items-start space-x-3 p-2 rounded-md transition-colors',
          selectedItems.includes(item.id)
            ? 'bg-falbor-elements-item-backgroundAccent'
            : 'bg-falbor-elements-bg-depth-2 hover:bg-falbor-elements-item-backgroundActive',
        )}
        style={{
          ...style,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Checkbox
          id={`item-${item.id}`}
          checked={selectedItems.includes(item.id)}
          onCheckedChange={() => handleToggleItem(item.id)}
        />
        <div className="grid gap-1.5 leading-none">
          <Label
            htmlFor={`item-${item.id}`}
            className={classNames(
              'text-sm font-medium cursor-pointer',
              selectedItems.includes(item.id)
                ? 'text-falbor-elements-item-contentAccent'
                : 'text-falbor-elements-textPrimary',
            )}
          >
            {item.label}
          </Label>
          {item.description && <p className="text-xs text-falbor-elements-textSecondary">{item.description}</p>}
        </div>
      </div>
    );
  };

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog showCloseButton={false}>
        <div className="p-6 bg-white dark:bg-gray-950 relative z-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="mt-2 mb-4">
            Select the items you want to include and click{' '}
            <span className="text-falbor-elements-item-contentAccent font-medium">{confirmLabel}</span>.
          </DialogDescription>

          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-falbor-elements-textSecondary">
                {selectedItems.length} of {items.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-8 px-2 text-falbor-elements-textPrimary hover:text-falbor-elements-item-contentAccent hover:bg-falbor-elements-item-backgroundAccent bg-falbor-elements-bg-depth-2 dark:bg-transparent"
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div
              className="pr-2 border rounded-md border-falbor-elements-borderColor bg-falbor-elements-bg-depth-2"
              style={{
                maxHeight,
              }}
            >
              {items.length > 0 ? (
                <FixedSizeList
                  height={listHeight}
                  width="100%"
                  itemCount={items.length}
                  itemSize={60}
                  className="scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-falbor-elements-bg-depth-3"
                >
                  {ItemRenderer}
                </FixedSizeList>
              ) : (
                <div className="text-center py-4 text-sm text-falbor-elements-textTertiary">No items to display</div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-falbor-elements-borderColor text-falbor-elements-textPrimary hover:bg-falbor-elements-item-backgroundActive"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className="bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 disabled:pointer-events-none"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Dialog>
    </RadixDialog.Root>
  );
}
