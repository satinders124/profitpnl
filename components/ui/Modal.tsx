"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  children: ReactNode;
  title?: string;
  open?: boolean;
  isOpen?: boolean;
  size?: "md" | "lg" | "xl";
  onClose: () => void;
};

export default function Modal({
  children,
  title,
  open,
  isOpen,
  size = "md",
  onClose,
}: ModalProps) {
  // FIX: If no 'open' prop is provided, we assume the parent is controlling 
  // the mounting (e.g. {formOpen && <Modal />}), so we default to true.
  const visible = open ?? isOpen ?? true;

  if (!visible) return null;

  const sizeClass =
    size === "xl" ? "max-w-6xl" : size === "lg" ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6 animate-in fade-in duration-200">
      {/* Backdrop: Now with a deeper blur and better color */}
      <button
        type="button"
        aria-label="Close modal backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Container */}
      <div className={`relative z-10 flex max-h-[90vh] w-full ${sizeClass} flex-col overflow-hidden rounded-[2.5rem] border border-[#1E1E38] bg-[#0D0D1A] shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-200`}>
        
        {/* Premium Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E38] px-6 py-5 bg-gradient-to-r from-[#0D0D1A] to-[#111120]">
          <div>
            {title && (
              <h2 className="text-xl font-black text-white tracking-tight">
                {title}
              </h2>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1E1E38] text-[#5A5A80] transition-all hover:bg-[#1E1E38] hover:text-white active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}