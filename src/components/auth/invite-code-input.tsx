"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteCodeInputProps {
    value: string;
    onChange: (value: string) => void;
    onValidationComplete?: (isValid: boolean, invitationId: string | null) => void;
    disabled?: boolean;
    required?: boolean;
    autoValidate?: boolean;
    className?: string;
}

type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

export function InviteCodeInput({
    value,
    onChange,
    onValidationComplete,
    disabled = false,
    required = true,
    autoValidate = true,
    className,
}: InviteCodeInputProps) {
    const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

    const validateCode = useCallback(async (code: string) => {
        if (!code || code.length < 10) {
            setValidationStatus("idle");
            setErrorMessage(null);
            return;
        }

        setValidationStatus("validating");
        setErrorMessage(null);

        try {
            const response = await fetch("/api/platform-invitations/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });

            const data = await response.json();

            if (data.valid) {
                setValidationStatus("valid");
                setErrorMessage(null);
                onValidationComplete?.(true, data.invitationId);
            } else {
                setValidationStatus("invalid");
                setErrorMessage(data.error || "Invalid invite code");
                onValidationComplete?.(false, null);
            }
        } catch {
            setValidationStatus("invalid");
            setErrorMessage("Unable to validate code");
            onValidationComplete?.(false, null);
        }
    }, [onValidationComplete]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value.toUpperCase();

        // Auto-format: add dash after BEE if not present
        if (newValue.length === 3 && newValue === "BEE") {
            newValue = "BEE-";
        }

        // Only allow valid characters (letters, numbers, dash)
        newValue = newValue.replace(/[^A-Z0-9-]/g, "");

        // Limit length to 10 characters (BEE-XXXXXX)
        if (newValue.length > 10) {
            newValue = newValue.slice(0, 10);
        }

        onChange(newValue);
        setValidationStatus("idle");
        setErrorMessage(null);

        // Debounced validation
        if (autoValidate && newValue.length === 10) {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
            const timeout = setTimeout(() => validateCode(newValue), 500);
            setDebounceTimeout(timeout);
        }
    };

    const handleValidateClick = () => {
        if (value.length >= 10) {
            validateCode(value);
        }
    };

    const getStatusIcon = () => {
        switch (validationStatus) {
            case "validating":
                return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
            case "valid":
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case "invalid":
                return <XCircle className="h-4 w-4 text-destructive" />;
            default:
                return null;
        }
    };

    return (
        <div className={cn("space-y-2", className)}>
            <Label htmlFor="inviteCode">
                Invite Code {required && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        id="inviteCode"
                        type="text"
                        placeholder="BEE-XXXXXX"
                        value={value}
                        onChange={handleChange}
                        disabled={disabled}
                        required={required}
                        className={cn(
                            "uppercase tracking-wider font-mono pr-8",
                            validationStatus === "valid" && "border-green-500 focus-visible:ring-green-500",
                            validationStatus === "invalid" && "border-destructive focus-visible:ring-destructive"
                        )}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {getStatusIcon()}
                    </div>
                </div>
                {!autoValidate && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleValidateClick}
                        disabled={disabled || value.length < 10 || validationStatus === "validating"}
                    >
                        Validate
                    </Button>
                )}
            </div>
            {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            {validationStatus === "valid" && (
                <p className="text-sm text-green-600">Code verified successfully!</p>
            )}
            <p className="text-xs text-muted-foreground">
                Enter the invite code you received to create an account.
            </p>
        </div>
    );
}
