import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          "bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4 p-6 animate-in fade-in",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-gray-900 mb-4">{children}</h3>;
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 mt-6">{children}</div>;
}
