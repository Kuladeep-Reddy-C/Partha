import { cn } from '../../lib/utils';
import { forwardRef, InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2',
            'text-sm placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-400',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="text-sm text-red-500 mt-1 absolute -bottom-6 left-0">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };