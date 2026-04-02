"use client";

interface ProgramRolesGridProps {
    roles?: {
        presiding?: string;
        conducting?: string;
        chorister?: string;
        pianistOrganist?: string;
    };
}

const ROLE_LABELS: { key: keyof NonNullable<ProgramRolesGridProps["roles"]>; label: string }[] = [
    { key: "presiding", label: "Presiding" },
    { key: "conducting", label: "Conducting" },
    { key: "chorister", label: "Chorister" },
    { key: "pianistOrganist", label: "Pianist/Organist" },
];

export function ProgramRolesGrid({ roles }: ProgramRolesGridProps) {
    if (!roles) return null;

    const filledRoles = ROLE_LABELS.filter(({ key }) => roles[key]?.trim());
    if (filledRoles.length === 0) return null;

    return (
        <div
            className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-[var(--program-radius)] border bg-[color:var(--program-soft)] px-[var(--program-card-padding-x)] py-[var(--program-card-padding-y)]"
            style={{
                boxShadow: "var(--program-card-shadow)",
                borderColor: "var(--program-card-border)",
                borderWidth: "var(--program-border-width)",
                borderStyle: "var(--program-card-border-style)",
            }}
        >
            {filledRoles.map(({ key, label }) => (
                <div key={key} className="min-w-0 space-y-1">
                    <p
                        className="text-[0.72em] uppercase tracking-[0.12em] text-[color:var(--program-subtle)]"
                        style={{ fontWeight: "var(--program-section-weight)" }}
                    >
                        {label}
                    </p>
                    <p className="truncate text-[1em] text-[color:var(--program-text)]" style={{ fontWeight: "var(--program-item-weight)" }}>
                        {roles[key]}
                    </p>
                </div>
            ))}
        </div>
    );
}
