export function ChatMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M5.2 4.5h13.6A1.7 1.7 0 0 1 20.5 6.2v9.1a1.7 1.7 0 0 1-1.7 1.7h-8.1L6 20.4v-3.4H5.2a1.7 1.7 0 0 1-1.7-1.7V6.2a1.7 1.7 0 0 1 1.7-1.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[10px] bg-zinc-900 text-white">
        <ChatMark />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
        SupportDesk <span className="font-normal text-zinc-500">AI</span>
      </span>
    </div>
  );
}
