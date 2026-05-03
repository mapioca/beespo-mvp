"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { UserPlus } from "lucide-react";
import { INVITABLE_ROLES } from "@/lib/auth/role-permissions";

const ROLE_DESCRIPTIONS: Record<(typeof INVITABLE_ROLES)[number], string> = {
    admin: "User and settings management (no billing or ownership)",
    editor: "Can create and edit content",
    commenter: "Read access plus the ability to comment",
    viewer: "Read-only access",
};

const ROLE_LABEL_TITLECASE: Record<(typeof INVITABLE_ROLES)[number], string> = {
    admin: "Admin",
    editor: "Editor",
    commenter: "Commenter",
    viewer: "Viewer",
};

interface InviteMemberDialogProps {
    onInviteSent: () => void;
}

export function InviteMemberDialog({ onInviteSent }: InviteMemberDialogProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<string>("editor");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch("/api/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send invitation");
            }

            if (data.emailSent) {
                toast.success("Invitation Sent", { description: `An invitation has been sent to ${email}.` });
            } else {
                toast.error("Invitation Created", { description: `Invitation for ${email} was created, but the email failed to send. Check your server logs and API key.` });
            }

            setEmail("");
            setRole("editor");
            setOpen(false);
            onInviteSent();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to send invitation");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                        Send an invitation to join your workspace. They&apos;ll receive an email with a link to accept.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="colleague@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={role} onValueChange={setRole} disabled={isLoading}>
                                <SelectTrigger id="role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {INVITABLE_ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium">{ROLE_LABEL_TITLECASE[r]}</span>
                                                <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Sending..." : "Send Invitation"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
