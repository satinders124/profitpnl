"use client";

import { X } from "lucide-react";

type ModalProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm lg:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[#2A2A50] bg-[#161628] p-5 shadow-2xl lg:max-w-2xl lg:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#2A2A50] lg:hidden" />
            <h2 className="text-xl font-black tracking-[-0.04em]">{title}</h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1E1E38] text-[#A0A0C0]"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}