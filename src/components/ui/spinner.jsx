import { cn } from '@/lib/utils';

function Spinner({ className, size = 'md', ...props }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const borderClasses = {
    sm: 'border',
    md: 'border-2',
    lg: 'border-2',
    xl: 'border-4',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'relative inline-flex items-center justify-center',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {/* Outer ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-border/60 dark:border-gray-700',
          borderClasses[size],
        )}
      ></div>

      {/* Animated gradient ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-spin',
          borderClasses[size],
        )}
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, #3b82f6 60deg, #8b5cf6 120deg, #ec4899 180deg, transparent 240deg)',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
          WebkitMask:
            'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
        }}
      ></div>

      {/* Inner pulsing dot */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>

      {/* Center dot */}
      <div className="relative w-1 h-1 rounded-full bg-card dark:bg-gray-900"></div>
    </div>
  );
}

export { Spinner };
