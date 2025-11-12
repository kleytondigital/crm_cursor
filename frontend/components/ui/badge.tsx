import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-brand-secondary/30 bg-brand-secondary/20 text-brand-secondary',
        secondary: 'border-white/10 bg-white/5 text-text-muted',
        destructive: 'border-brand-danger/30 bg-brand-danger/20 text-brand-danger',
        outline: 'border-white/15 bg-transparent text-text-primary',
        warning: 'border-brand-warning/30 bg-brand-warning/10 text-brand-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

