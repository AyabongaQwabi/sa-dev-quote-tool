'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const PopoverContext = React.createContext({
  open: false,
  setOpen: () => {},
  triggerRef: null,
});

const Popover = ({ open: controlledOpen, onOpenChange, children }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const triggerRef = React.useRef(null);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback(
    (v) => {
      if (!isControlled) setUncontrolledOpen(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange]
  );

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
};

const PopoverTrigger = React.forwardRef(({ className, asChild, children, ...props }, ref) => {
  const ctx = React.useContext(PopoverContext);
  const mergedRef = (node) => {
    ctx.triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };
  const handleClick = () => ctx.setOpen(!ctx.open);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctx.setOpen(!ctx.open);
    }
  };
  return (
    <button
      ref={mergedRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={ctx.open}
      className={cn(
        'inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </button>
  );
});
PopoverTrigger.displayName = 'PopoverTrigger';

const PopoverContent = React.forwardRef(
  ({ className, align = 'start', sideOffset = 4, children, onCloseAutoFocus, ...props }, ref) => {
    const ctx = React.useContext(PopoverContext);
    const contentRef = React.useRef(null);

    React.useEffect(() => {
      if (!ctx.open) return;
      const handleEscape = (e) => {
        if (e.key === 'Escape') ctx.setOpen(false);
      };
      const handleClickOutside = (e) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(e.target) &&
          ctx.triggerRef?.current &&
          !ctx.triggerRef.current.contains(e.target)
        ) {
          ctx.setOpen(false);
        }
      };
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ctx.open, ctx.setOpen]);

    if (!ctx.open) return null;

    return (
      <div
        ref={(r) => {
          contentRef.current = r;
          if (typeof ref === 'function') ref(r);
          else if (ref) ref.current = r;
        }}
        role="dialog"
        className={cn(
          'absolute z-50 min-w-[180px] rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none',
          align === 'start' && 'left-0',
          align === 'end' && 'right-0',
          'top-full mt-1',
          className
        )}
        style={{ marginTop: sideOffset }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };
