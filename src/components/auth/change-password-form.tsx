"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface ChangePasswordFormProps {
    email: string;
}

export function ChangePasswordForm({ email }: ChangePasswordFormProps) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "verifying" | "updating">("idle");

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!email) {
            toast.error("User email is missing. Cannot verify identity.");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Invalid password", { description: "Password must be at least 6 characters long" });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match", { description: "Please ensure both new passwords match" });
            return;
        }

        try {
            setStatus("verifying");
            const supabase = createClient();

            // Step 1: Verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: currentPassword,
            });

            if (signInError) {
                toast.error("Current password incorrect", { description: "Please enter your correct current password to proceed." });
                setStatus("idle");
                return;
            }

            setStatus("updating");

            // Step 2: Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                toast.error("Error updating password", { description: updateError.message || "Failed to update password" });
            } else {
                toast.success("Your password has been updated successfully");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch (error) {
            console.error("Unexpected error during password change:", error);
            toast.error("Unexpected Error", { description: "An unexpected error occurred. Please try again." });
        } finally {
            setStatus("idle");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Change Password
                </CardTitle>
                <CardDescription>
                    Update your account password
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            required
                        />
                    </div>
                    <Button type="submit" disabled={status !== "idle" || !currentPassword || !newPassword || !confirmPassword}>
                        {status !== "idle" ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Lock className="h-4 w-4 mr-2" />
                        )}
                        {status === "verifying" ? "Verifying..." : status === "updating" ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
