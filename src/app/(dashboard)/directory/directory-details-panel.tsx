"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    DetailsPanel,
    DetailsPanelSection,
    DetailsPanelField,
} from "@/components/ui/details-panel";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { DirectoryMember } from "./directory-client";

interface DirectoryDetailsPanelProps {
    member: DirectoryMember | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DirectoryDetailsPanel({
    member,
    open,
    onOpenChange,
}: DirectoryDetailsPanelProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [gender, setGender] = useState<"male" | "female" | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (member) {
            setName(member.name);
            setGender(member.gender ?? null);
        }
    }, [member]);

    const saveField = useCallback(
        async (field: string, value: unknown) => {
            if (!member) return;
            const supabase = createClient();
            const { error } = await (supabase.from("directory") as ReturnType<typeof supabase.from>)
                .update({ [field]: value })
                .eq("id", member.id);
            if (error) {
                toast.error("Failed to save", { description: error.message });
            } else {
                router.refresh();
            }
        },
        [member, router]
    );

    const handleNameBlur = () => {
        if (!member || name.trim() === member.name) return;
        if (!name.trim()) {
            setName(member.name);
            return;
        }
        saveField("name", name.trim());
    };

    const handleGenderChange = (value: "male" | "female") => {
        setGender(value);
        saveField("gender", value);
    };

    const handleDelete = async () => {
        if (!member) return;
        setIsDeleting(true);
        const supabase = createClient();
        const { error } = await (supabase.from("directory") as ReturnType<typeof supabase.from>)
            .delete()
            .eq("id", member.id);
        setIsDeleting(false);
        setShowDeleteDialog(false);

        if (error) {
            toast.error("Failed to delete member", { description: error.message });
        } else {
            toast.success("Member deleted");
            onOpenChange(false);
            router.refresh();
        }
    };

    return (
        <>
            <DetailsPanel
                open={open}
                onOpenChange={onOpenChange}
                onDelete={() => setShowDeleteDialog(true)}
            >
                <DetailsPanelSection>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="Member name"
                        className="border-0 bg-transparent shadow-none px-0 h-auto text-[15px] font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0"
                    />
                </DetailsPanelSection>

                <Separator />

                <DetailsPanelSection title="Attributes">
                    <DetailsPanelField label="Gender">
                        <div className="flex items-center gap-1.5">
                            {(["male", "female"] as const).map((value) => {
                                const selected = gender === value;
                                return (
                                    <Button
                                        key={value}
                                        type="button"
                                        variant={selected ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleGenderChange(value)}
                                        className={cn(
                                            "h-7 rounded-full px-2.5 text-[11px]",
                                            selected && "bg-foreground text-background hover:bg-foreground/90"
                                        )}
                                    >
                                        {value === "male" ? "Male" : "Female"}
                                    </Button>
                                );
                            })}
                        </div>
                    </DetailsPanelField>
                </DetailsPanelSection>
            </DetailsPanel>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{member?.name}&quot;? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
