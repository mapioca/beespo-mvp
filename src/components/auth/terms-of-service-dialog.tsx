"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TermsContent } from "./terms-content";

export function TermsOfServiceDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <span className="cursor-pointer font-medium underline underline-offset-4 hover:text-primary">
                    Terms and Conditions
                </span>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] w-full max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Terms and Conditions</DialogTitle>
                    <DialogDescription>
                        Please read our terms and conditions carefully.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <TermsContent />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

