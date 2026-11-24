import { Link } from 'react-router-dom';

type AuthSwitchProps = {
  prompt: string;
  linkText: string;
  to: string;
};

export function AuthSwitch({ prompt, linkText, to }: AuthSwitchProps) {
  return (
    <p className="mt-6 border-t border-zinc-200 pt-6 text-center text-[13px] text-zinc-600">
      {prompt}{' '}
      <Link
        to={to}
        className="rounded font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        {linkText}
      </Link>
    </p>
  );
}
