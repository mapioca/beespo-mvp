"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ProgramViewProps } from "./types";
import type { CSSProperties } from "react";
import { ProgramHeader } from "./program-header";
import { ProgramRolesGrid } from "./program-roles-grid";
import { ProgramAgendaItem } from "./program-agenda-item";
import { ProgramFooter } from "./program-footer";

export function ProgramView({
    data,
    variant = "embedded",
    density = "comfortable",
    showDivider = true,
    className,
}: ProgramViewProps) {
    const paddingClass = density === "compact" ? "px-5 py-6" : "px-6 py-7";

    return (
        <div
            className={cn(
                "mx-auto w-full text-[color:var(--program-text)]",
                paddingClass,
                className
            )}
            style={{ lineHeight: "var(--program-line-height)" }}
        >
            <div className="space-y-[var(--program-section-gap)]">
                <ProgramHeader
                    title={data.title}
                    date={data.date}
                    time={data.time}
                    unitName={data.unitName}
                    variant={variant}
                />

                <ProgramRolesGrid roles={data.roles} />

                {showDivider && (
                    <div
                        className="my-1"
                        style={{
                            borderTopWidth: "var(--program-divider-weight)",
                            borderTopStyle: "var(--program-divider-style)" as CSSProperties["borderTopStyle"],
                            borderTopColor: "var(--program-border)",
                        }}
                    />
                )}

                <div className="space-y-[var(--program-item-gap)]">
                    {data.items.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.18,
                                delay: index * 0.02,
                                ease: "easeOut",
                            }}
                        >
                            <ProgramAgendaItem item={item} />
                        </motion.div>
                    ))}
                </div>

                <ProgramFooter />
            </div>
        </div>
    );
}
