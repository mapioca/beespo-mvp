import { ReactNode } from "react";

export default function PrintLayout({ children }: { children: ReactNode }) {
    return (
        <div className="bg-white min-h-screen text-black">
            {children}
        </div>
    );
}
