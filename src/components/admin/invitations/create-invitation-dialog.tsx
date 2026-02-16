"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { createInvitationAction } from "@/app/(admin)/admin/invitations/actions";
import { Plus, Copy, Check } from "lucide-react";

export function CreateInvitationDialog() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [isLoading, setIsLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const expDays = expiresInDays === "none" ? null : parseInt(expiresInDays);
      const result = await createInvitationAction(
        description,
        parseInt(maxUses),
        expDays
      );

      if (result.success && result.code) {
        setCreatedCode(result.code);
        toast.success("Invitation Created", { description: `Code: ${result.code}` });
      } else {
        toast.error(result.error || "Failed to create invitation.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (createdCode) {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedCode(null);
    setDescription("");
    setMaxUses("1");
    setExpiresInDays("7");
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
          <Plus className="mr-2 h-4 w-4" />
          Create Invitation
        </Button>
      </DialogTrigger>
      <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
        {createdCode ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation Created</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Share this code with the person you want to invite.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex items-center gap-3 justify-center">
                <code className="text-2xl font-mono font-bold tracking-wider text-zinc-100">
                  {createdCode}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  {copied ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleClose}
                className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create Platform Invitation</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Generate an invite code for platform access.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="inv-description" className="text-zinc-300">
                    Description (optional)
                  </Label>
                  <Input
                    id="inv-description"
                    placeholder="e.g., New ward bishopric"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                    className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-max-uses" className="text-zinc-300">
                    Max Uses
                  </Label>
                  <Input
                    id="inv-max-uses"
                    type="number"
                    min="1"
                    max="100"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    disabled={isLoading}
                    className="border-zinc-700 bg-zinc-800 text-zinc-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-expires" className="text-zinc-300">
                    Expires In
                  </Label>
                  <Select
                    value={expiresInDays}
                    onValueChange={setExpiresInDays}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-800">
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="none">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                >
                  {isLoading ? "Creating..." : "Create Code"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
