import { RiChat3Fill } from '@remixicon/react';

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[10px] bg-zinc-900 text-white">
        <RiChat3Fill className="size-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
        SupportDesk <span className="font-normal text-zinc-500">AI</span>
      </span>
    </div>
  );
}
