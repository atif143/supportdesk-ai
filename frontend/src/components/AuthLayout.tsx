import { ReactNode } from 'react';
import { Brand } from './Brand';

// A single centred card keeps the form balanced from small laptops to large screens.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_0%,#fbfbfa_0%,#f4f4f2_45%,#efeeec_100%)] px-5 py-10 sm:py-12">
      <div className="w-full max-w-[400px]">
        <div className="animate-card-in rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_16px_40px_-24px_rgba(24,24,27,0.2)] sm:p-8">
          <Brand />
          <div className="mt-8">{children}</div>
        </div>

        <p className="mt-7 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} SupportDesk AI
        </p>
      </div>
    </main>
  );
}
