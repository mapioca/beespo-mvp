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
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 px-4 rounded-lg bg-muted/50">
            {filledRoles.map(({ key, label }) => (
                <div key={key} className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
                    <p className="text-sm font-medium truncate">{roles[key]}</p>
                </div>
            ))}
        </div>
    );
}
