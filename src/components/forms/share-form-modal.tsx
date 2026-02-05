"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
    Copy,
    Check,
    Mail,
    Download,
    Link as LinkIcon,
    QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Form } from "@/types/form-types";

interface ShareFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: Form;
    workspaceSlug?: string;
}

export function ShareFormModal({
    open,
    onOpenChange,
    form,
}: ShareFormModalProps) {
    const [copied, setCopied] = useState(false);

    // Generate public URL
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${baseUrl}/f/${form.slug}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            toast.success("Link copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy link");
        }
    };

    const handleEmailShare = () => {
        const subject = encodeURIComponent(`Please fill out: ${form.title}`);
        const body = encodeURIComponent(
            `Hi,\n\nPlease take a moment to fill out this form:\n\n${form.title}\n${publicUrl}\n\nThank you!`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    };

    const handleDownloadQR = () => {
        const svg = document.getElementById("qr-code-svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");

            const downloadLink = document.createElement("a");
            downloadLink.download = `${form.slug}-qr-code.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
        toast.success("QR code downloaded");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Form</DialogTitle>
                    <DialogDescription>
                        Share &quot;{form.title}&quot; with others
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="link" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="link">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Link
                        </TabsTrigger>
                        <TabsTrigger value="qr">
                            <QrCode className="h-4 w-4 mr-2" />
                            QR Code
                        </TabsTrigger>
                        <TabsTrigger value="email">
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                        </TabsTrigger>
                    </TabsList>

                    {/* Link Tab */}
                    <TabsContent value="link" className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Input
                                readOnly
                                value={publicUrl}
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopyLink}
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Anyone with this link can view and submit the form.
                        </p>
                    </TabsContent>

                    {/* QR Code Tab */}
                    <TabsContent value="qr" className="space-y-4">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-white rounded-lg">
                                <QRCodeSVG
                                    id="qr-code-svg"
                                    value={publicUrl}
                                    size={200}
                                    level="H"
                                    includeMargin
                                />
                            </div>
                            <Button variant="outline" onClick={handleDownloadQR}>
                                <Download className="h-4 w-4 mr-2" />
                                Download QR Code
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                Scan this QR code with a mobile device to open the form.
                            </p>
                        </div>
                    </TabsContent>

                    {/* Email Tab */}
                    <TabsContent value="email" className="space-y-4">
                        <div className="text-center space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Send an email with the form link using your default email client.
                            </p>
                            <Button onClick={handleEmailShare} className="w-full">
                                <Mail className="h-4 w-4 mr-2" />
                                Open Email Client
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
