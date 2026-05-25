import React, { useState, useRef, useEffect } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

export const DEVICE_WIDTHS = {
  desktop: null,
  tablet: 768,
  phone: 375,
};

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet (768px)", icon: Tablet },
  { id: "phone", label: "Phone (375px)", icon: Smartphone },
];

export default function DevicePreviewToggle({ activeDevice, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = DEVICES.find((d) => d.id === activeDevice) || DEVICES[0];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-[var(--ct-bg-card)] rounded-xl border border-[var(--ct-border)] overflow-hidden mb-1 min-w-[180px]">
          {DEVICES.map((device) => {
            const Icon = device.icon;
            const isActive = activeDevice === device.id;
            return (
              <button
                key={device.id}
                className={`flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-[var(--ct-bg-elevated)] transition-colors ${
                  isActive ? "bg-orange-50 text-orange-600 font-semibold" : "text-[var(--ct-text-primary)]"
                }`}
                onClick={() => {
                  onChange(device.id);
                  setOpen(false);
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{device.label}</span>
                {isActive && <span className="ml-auto text-orange-500 text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
      <button
        className="w-12 h-12 rounded-full bg-[var(--ct-accent)] text-white flex items-center justify-center hover:bg-[var(--ct-bg-elevated)] transition-colors"
        onClick={() => setOpen((o) => !o)}
        title="Device Preview"
      >
        <CurrentIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
