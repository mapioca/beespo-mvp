"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ProgramViewProps } from "./types";
import { ProgramHeader } from "./program-header";
import { ProgramRolesGrid } from "./program-roles-grid";
import { ProgramAgendaItem } from "./program-agenda-item";
import { ProgramFooter } from "./program-footer";

export function ProgramView({ data, variant = "embedded", className }: ProgramViewProps) {
    const isStandalone = variant === "standalone";

    return (
        <div
            className={cn(
                "w-full max-w-md mx-auto text-slate-900",
                isStandalone ? "px-7 py-10" : "px-6 py-8",
                className
            )}
        >
            <ProgramHeader
                title={data.title}
                date={data.date}
                time={data.time}
                unitName={data.unitName}
                variant={variant}
            />

            <ProgramRolesGrid roles={data.roles} />

            {/* Separator */}
            <div className="border-t border-slate-200/80 my-6" />

            {/* Agenda items */}
            <div className="space-y-2">
                {data.items.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.3,
                            delay: index * 0.035,
                            ease: "easeOut",
                        }}
                    >
                        <ProgramAgendaItem item={item} />
                    </motion.div>
                ))}
            </div>

            {isStandalone && <ProgramFooter />}
        </div>
    );
}
