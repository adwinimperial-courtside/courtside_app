import React, { createContext, useContext, useEffect, useState } from "react";

// Deviceprevioew context so pages can adapt to the admin's simulated viewport.
// Tailwind's md:* classes look at the real browser viewport and don't respond
// to the preview frame width, so responsive-class-only pages break inside phone/tablet preview.
// Pages that need a real layout switch should use `useIsNarrowLayout()` instead.

const DevicePreviewContext = createContext({ deviceMode: "desktop" });

export function DevicePreviewProvider({ deviceMode, children }) {
  return (
    <DevicePreviewContext.Provider value={{ deviceMode }}>
      {children}
    </DevicePreviewContext.Provider>
  );
}

export function useDevicePreview() {
  return useContext(DevicePreviewContext);
}

/**
 * True when the effective container is narrower than the md breakpoint (768px).
 * - real viewport < 768px → true (actual mobile)
 * - admin preview set to phone or tablet → true (simulated narrow frame)
 * - desktop with normal viewport → false
 */
export function useIsNarrowLayout() {
  const { deviceMode } = useDevicePreview();

  const [viewportNarrow, setViewportNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setViewportNarrow(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (deviceMode === "phone" || deviceMode === "tablet") return true;
  return viewportNarrow;
}
