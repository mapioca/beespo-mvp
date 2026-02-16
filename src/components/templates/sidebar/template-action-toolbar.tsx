"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X, Trash2, Loader2 } from "lucide-react";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

interface TemplateActionToolbarProps {
    templateId: string;
    onSave: () => Promise<void>;
    isSaving?: boolean;
    hasChanges?: boolean;
}

export function TemplateActionToolbar({
    templateId,
    onSave,
    isSaving = false,
    hasChanges = false,
}: TemplateActionToolbarProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        const supabase = createClient();

        // Delete template items first
        await (supabase.from("template_items") as ReturnType<typeof supabase.from>)
            .delete()
            .eq("template_id", templateId);

        // Delete template
        const { error } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
            .delete()
            .eq("id", templateId);

        if (error) {
            toast.error("Failed to delete template.");
            setIsDeleting(false);
            return;
        }

        toast.success("Template deleted", { description: "The template has been permanently deleted." });
        router.push("/meetings/templates");
    };

    const handleCancel = () => {
        router.push(`/meetings/templates/${templateId}`);
    };

    return (
        <div className="space-y-3">
            {/* Primary Actions Row - Save, Cancel */}
            <div className="flex items-center gap-2">
                {/* Save - Primary CTA */}
                <Button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>

                {/* Cancel - Secondary/Outline */}
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    title="Cancel"
                    className="shrink-0"
                >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
            </div>

            {/* Danger Zone - Delete */}
            <div className="pt-2 border-t">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isDeleting || isSaving}
                        >
                            {isDeleting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Delete Template
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this template and all its agenda items.
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {/* Unsaved changes indicator */}
            {hasChanges && !isSaving && (
                <p className="text-xs text-amber-600 dark:text-amber-500 text-center">
                    You have unsaved changes
                </p>
            )}
        </div>
    );
}
