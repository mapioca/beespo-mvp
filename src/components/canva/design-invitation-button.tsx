"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Palette, Loader2 } from "lucide-react";
import { useIsCanvaConnected, useIsConnecting } from "@/stores/apps-store";

interface DesignInvitationButtonProps {
    eventId: string;
    eventTitle: string;
    onClick: () => void;
    disabled?: boolean;
    size?: "default" | "sm" | "lg" | "icon";
    variant?: "default" | "outline" | "ghost" | "secondary";
}

export function DesignInvitationButton({
    onClick,
    disabled = false,
    size = "sm",
    variant = "outline",
}: DesignInvitationButtonProps) {
    const isCanvaConnected = useIsCanvaConnected();
    const isConnecting = useIsConnecting("canva");

    const isDisabled = disabled || !isCanvaConnected || isConnecting;

    const button = (
        <Button
            size={size}
            variant={variant}
            onClick={onClick}
            disabled={isDisabled}
            className="gap-2"
        >
            {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Palette className="h-4 w-4" />
            )}
            Create Invitation
        </Button>
    );

    if (!isCanvaConnected && !isConnecting) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex">{button}</span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Add Canva from the Apps Hub to enable this feature</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return button;
}
