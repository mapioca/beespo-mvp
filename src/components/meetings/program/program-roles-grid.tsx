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
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3">
            {filledRoles.map(({ key, label }) => (
                <div key={key} className="min-w-0 space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">{label}</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{roles[key]}</p>
                </div>
            ))}
        </div>
    );
}
