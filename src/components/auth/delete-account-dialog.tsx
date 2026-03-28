"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { AlertTriangle, Loader2, ShieldCheck, Trash2 } from "lucide-react";

type PreflightResult = {
    canDelete: boolean;
    scenario: "clear" | "last_member" | "last_admin";
    workspaceName?: string;
    memberCount?: number;
    promotableMembers?: { id: string; full_name: string; email: string; role: string }[];
};

type Step = "idle" | "loading" | "last_member" | "last_admin" | "confirm" | "deleting";

interface DeleteAccountDialogProps {
    userEmail: string;
}

export function DeleteAccountDialog({ userEmail }: DeleteAccountDialogProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<Step>("idle");
    const [preflight, setPreflight] = useState<PreflightResult | null>(null);
    const [confirmation, setConfirmation] = useState("");
    const [promotingId, setPromotingId] = useState<string | null>(null);

    const openDialog = useCallback(async () => {
        setIsOpen(true);
        setStep("loading");
        setConfirmation("");
        setPreflight(null);

        try {
            const res = await fetch("/api/account/delete/preflight");
            const data: PreflightResult = await res.json();
            setPreflight(data);

            if (data.scenario === "last_admin") {
                setStep("last_admin");
            } else if (data.scenario === "last_member") {
                setStep("last_member");
            } else {
                setStep("confirm");
            }
        } catch {
            toast.error("Failed to check account status");
            setIsOpen(false);
            setStep("idle");
        }
    }, []);

    const closeDialog = useCallback(() => {
        if (step === "deleting") return;
        setIsOpen(false);
        setStep("idle");
        setConfirmation("");
        setPreflight(null);
    }, [step]);

    const handlePromote = useCallback(async (memberId: string) => {
        setPromotingId(memberId);
        try {
            const res = await fetch("/api/workspace/promote-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to promote member");

            toast.success("Member promoted to admin");
            setStep("confirm");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to promote member");
        } finally {
            setPromotingId(null);
        }
    }, []);

    const handleDelete = useCallback(async () => {
        if (confirmation !== "DELETE") return;
        setStep("deleting");

        try {
            const res = await fetch("/api/account/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: "DELETE" }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete account");

            toast.info("Account Deleted", { description: "Your account has been permanently deleted. Redirecting..." });
            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 2000);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete account");
            setStep("confirm");
        }
    }, [confirmation, router]);

    return (
        <>
            <Button variant="destructive" className="gap-2" onClick={openDialog}>
                <Trash2 className="h-4 w-4" />
                Delete Account
            </Button>

            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
                <DialogContent className="max-w-md" onInteractOutside={(e) => { if (step === "deleting") e.preventDefault(); }}>

                    {/* Loading */}
                    {step === "loading" && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {/* Last member — workspace will be deleted */}
                    {step === "last_member" && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                                        <AlertTriangle className="h-5 w-5 text-destructive" />
                                    </div>
                                    <DialogTitle>This will delete your workspace</DialogTitle>
                                </div>
                                <DialogDescription asChild>
                                    <div className="space-y-3 text-sm">
                                        <p>
                                            You are the <strong>last member</strong> of{" "}
                                            <strong>{preflight?.workspaceName}</strong>. Deleting your account
                                            will permanently delete the workspace and all its data.
                                        </p>
                                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                                            <p className="font-medium text-destructive text-xs mb-1">
                                                Everything in the workspace will be permanently deleted:
                                            </p>
                                            <ul className="list-disc list-inside space-y-0.5 text-destructive/80 text-xs">
                                                <li>All meetings and agendas</li>
                                                <li>All directory members</li>
                                                <li>All tasks and discussions</li>
                                                <li>All templates and content</li>
                                            </ul>
                                        </div>
                                    </div>
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                                <Button variant="destructive" onClick={() => setStep("confirm")}>
                                    I understand, continue
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {/* Last admin — must promote someone first */}
                    {step === "last_admin" && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                                        <ShieldCheck className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <DialogTitle>Promote an admin first</DialogTitle>
                                </div>
                                <DialogDescription>
                                    You are the <strong>only admin</strong> of{" "}
                                    <strong>{preflight?.workspaceName}</strong>. Promote another member to
                                    admin before deleting your account.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 max-h-52 overflow-y-auto">
                                {preflight?.promotableMembers?.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div className="min-w-0 flex-1 mr-3">
                                            <p className="text-sm font-medium truncate">{member.full_name}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {member.email} · <span className="capitalize">{member.role}</span>
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handlePromote(member.id)}
                                            disabled={promotingId !== null}
                                            className="shrink-0"
                                        >
                                            {promotingId === member.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                "Make Admin"
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                            </DialogFooter>
                        </>
                    )}

                    {/* Confirm deletion */}
                    {(step === "confirm" || step === "deleting") && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                                        <AlertTriangle className="h-5 w-5 text-destructive" />
                                    </div>
                                    <DialogTitle>Delete Account</DialogTitle>
                                </div>
                                <DialogDescription asChild>
                                    <div className="space-y-4 text-sm">
                                        <p>
                                            This action <strong>cannot be undone</strong>. This will permanently
                                            delete your account and remove your personal information.
                                        </p>

                                        {preflight?.scenario === "last_member" && (
                                            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                                                <strong>Note:</strong> As the last member,{" "}
                                                <strong>{preflight.workspaceName}</strong> and all its data will
                                                also be permanently deleted.
                                            </div>
                                        )}

                                        <div className="rounded-lg bg-muted p-3 space-y-2">
                                            <p className="font-medium text-foreground">What will happen:</p>
                                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                <li>Your name and email will be removed</li>
                                                <li>You will be signed out of all devices</li>
                                                <li>Active tasks assigned to you will be unassigned</li>
                                                <li>Content you created will remain as &quot;Former Member&quot;</li>
                                            </ul>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirmation" className="text-foreground">
                                                Type <span className="font-mono font-bold">DELETE</span> to confirm
                                            </Label>
                                            <Input
                                                id="confirmation"
                                                value={confirmation}
                                                onChange={(e) => setConfirmation(e.target.value)}
                                                placeholder="DELETE"
                                                disabled={step === "deleting"}
                                                className="font-mono"
                                            />
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            Deleting account for:{" "}
                                            <span className="font-medium">{userEmail}</span>
                                        </p>
                                    </div>
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={closeDialog}
                                    disabled={step === "deleting"}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={confirmation !== "DELETE" || step === "deleting"}
                                >
                                    {step === "deleting" ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Delete Account"
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
