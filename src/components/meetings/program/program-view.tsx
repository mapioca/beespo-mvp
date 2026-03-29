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
                "w-full max-w-md mx-auto",
                isStandalone ? "px-6 py-10" : "px-5 py-6",
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
            <div className="border-t border-border/60 my-5" />

            {/* Agenda items */}
            <div className="space-y-0.5">
                {data.items.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.3,
                            delay: index * 0.04,
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
