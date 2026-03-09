'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const AccordionContext = React.createContext({
  openValue: null,
  setOpenValue: () => {},
});

const Accordion = ({
  type = 'single',
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...props
}) => {
  const [openValue, setOpenValue] = React.useState(() => {
    if (value !== undefined) return value;
    if (defaultValue !== undefined) return defaultValue;
    return type === 'multiple' ? [] : null;
  });
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : openValue;
  const openSet =
    type === 'multiple' ? new Set(Array.isArray(currentValue) ? currentValue : []) : null;
  const singleValue = type === 'single' ? currentValue : null;

  const handleValueChange = React.useCallback(
    (v, isOpen) => {
      if (type === 'single') {
        const next = isOpen ? null : v;
        if (!isControlled) setOpenValue(next);
        onValueChange?.(next);
      } else {
        const set = new Set(Array.isArray(currentValue) ? currentValue : []);
        if (isOpen) set.delete(v);
        else set.add(v);
        const next = Array.from(set);
        if (!isControlled) setOpenValue(next);
        onValueChange?.(next);
      }
    },
    [type, isControlled, currentValue, onValueChange]
  );

  return (
    <AccordionContext.Provider
      value={{
        openValue: singleValue,
        openSet,
        setOpenValue: handleValueChange,
        type,
      }}
    >
      <div className={cn('space-y-1', className)} data-state={currentValue} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

const AccordionItem = React.forwardRef(({ value, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('border rounded-md overflow-hidden', className)}
    data-state={value}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef(
  ({ className, children, onClick, value, ...props }, ref) => {
    const ctx = React.useContext(AccordionContext);
    const isOpen =
      ctx.type === 'multiple' ? ctx.openSet?.has(value) : ctx.openValue === value;
    const handleClick = (e) => {
      ctx.setOpenValue(value, isOpen);
      onClick?.(e);
    };
    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={isOpen}
        className={cn(
          'flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
    );
  }
);
AccordionTrigger.displayName = 'AccordionTrigger';

const AccordionContent = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(AccordionContext);
  const isOpen =
    ctx.type === 'multiple' ? ctx.openSet?.has(value) : ctx.openValue === value;
  return (
    <div
      ref={ref}
      data-state={isOpen ? 'open' : 'closed'}
      className={cn('overflow-hidden transition-all', !isOpen && 'hidden')}
      {...props}
    >
      <div className={cn('px-4 pb-3 pt-0', className)}>{children}</div>
    </div>
  );
});
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
