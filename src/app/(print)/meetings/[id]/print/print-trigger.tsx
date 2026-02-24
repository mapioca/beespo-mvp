"use client";

import { useEffect } from "react";

export function PrintTrigger() {
    useEffect(() => {
        // Delay slightly to ensure component has hydration and markdown rendering is complete
        const timeoutId = setTimeout(() => {
            window.print();
        }, 800);

        return () => clearTimeout(timeoutId);
    }, []);

    return null;
}
