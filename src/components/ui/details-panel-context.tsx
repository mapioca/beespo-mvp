"use client";

import { createContext, useContext } from "react";

interface DetailsPanelContextValue {
    portalEl: HTMLElement | null;
    reportOpen: (open: boolean) => void;
}

export const DetailsPanelContext = createContext<DetailsPanelContextValue>({
    portalEl: null,
    reportOpen: () => {},
});

export function useDetailsPanelContext() {
    return useContext(DetailsPanelContext);
}
