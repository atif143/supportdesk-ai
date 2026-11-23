import { ReactNode } from 'react';

type AuthAlertProps = {
  tone?: 'error' | 'success';
  children: ReactNode;
};

export function AuthAlert({ tone = 'error', children }: AuthAlertProps) {
  const success = tone === 'success';

  return (
    <p
      role={success ? 'status' : 'alert'}
      className={`rounded-lg border px-3 py-2.5 text-[13px] leading-snug ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {children}
    </p>
  );
}
