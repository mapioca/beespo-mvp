"use client";

import { createContext, useContext } from "react";

type MobileNavContextValue = {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
};

export const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function useMobileNav() {
    return useContext(MobileNavContext);
}
