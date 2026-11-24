type AuthSubmitButtonProps = {
  busy: boolean;
  label: string;
  busyLabel: string;
};

export function AuthSubmitButton({ busy, label, busyLabel }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-progress disabled:opacity-60"
    >
      {busy ? busyLabel : label}
    </button>
  );
}
