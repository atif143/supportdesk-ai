import { useState } from 'react';

type TextFieldProps = {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  hint?: string;
  error?: string;
  disabled?: boolean;
};

// A labelled input. Password fields get a small Show / Hide button.
export function TextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  hint,
  error,
  disabled,
}: TextFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && visible ? 'text' : type;

  // Point the screen reader at the hint or the error under the input.
  const describedBy =
    [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-zinc-700">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-lg border text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-70 ${
            isPassword ? 'pl-3 pr-16' : 'px-3'
          } ${
            error
              ? 'border-red-300 bg-red-50/40 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/10'
              : 'border-zinc-300 bg-stone-50 hover:border-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/10'
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            disabled={disabled}
            className="absolute inset-y-0 right-1.5 my-auto grid h-8 w-12 place-items-center rounded-md text-xs font-medium text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-zinc-900 disabled:opacity-60"
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs leading-snug text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs leading-snug text-zinc-400">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
