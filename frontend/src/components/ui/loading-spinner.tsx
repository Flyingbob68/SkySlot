import { cn } from '@/lib/utils';

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
} as const;

type SpinnerSize = keyof typeof spinnerSizes;

interface LoadingSpinnerProps {
  readonly size?: SpinnerSize;
  readonly className?: string;
  readonly centered?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  className,
  centered = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <svg
      className={cn('animate-spin text-primary', spinnerSizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Caricamento in corso"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  if (centered) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
