import { AlertIcon } from './icons';

type ErrorBoxProps = {
  title?: string; // optional bold first line, for example "Could not create the ticket"
  message: string;
  className?: string; // extra space around the box, for example "mt-4"
};

// The red box we show when something went wrong
export function ErrorBox({ title, message, className = '' }: ErrorBoxProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 ${className}`}
    >
      <AlertIcon className="mt-px size-4 shrink-0 text-red-600" />
      <div>
        {title && <p className="text-[13px] font-medium text-red-800">{title}</p>}
        <p className="text-[13px] text-red-700">{message}</p>
      </div>
    </div>
  );
}
