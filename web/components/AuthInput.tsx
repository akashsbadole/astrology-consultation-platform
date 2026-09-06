'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const AuthInput = forwardRef<HTMLInputElement, Props>(function AuthInput(
  { label, error, className, ...rest },
  ref
) {
  return (
    <div className="mb-5">
      <label className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</label>
      <input
        ref={ref}
        className={`w-full rounded-[10px] border bg-parchment-dim px-3 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-brass-dim/60 ${
          error ? 'border-error' : 'border-transparent focus:border-brass'
        } ${className ?? ''}`}
        {...rest}
      />
      {error && <p className="mt-1.5 text-[13px] text-error">{error}</p>}
    </div>
  );
});
