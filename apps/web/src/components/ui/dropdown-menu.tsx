import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
  items: DropdownItem[];
}

interface DropdownItem {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}

export function DropdownMenu({ children, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
      >
        {children}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm transition",
                item.variant === "danger"
                  ? "text-red-600 hover:bg-red-50"
                  : "text-gray-700 hover:bg-gray-50",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
