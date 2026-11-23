type AuthCardHeaderProps = {
  title: string;
  subtitle: string;
};

export function AuthCardHeader({ title, subtitle }: AuthCardHeaderProps) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-900">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{subtitle}</p>
    </header>
  );
}
