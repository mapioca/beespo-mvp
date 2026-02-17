"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RequestHistory } from "./request-history"

interface SupportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail: string
  userName: string
}

type RequestType = "Bug Report" | "Feature Request" | "General Question"
type Priority = "Low" | "Medium" | "High"
type SubmissionState = "idle" | "loading" | "success" | "error"

export function SupportModal({
  open,
  onOpenChange,
  userEmail,
  userName,
}: SupportModalProps) {
  const [activeTab, setActiveTab] = useState("new")
  const [requestType, setRequestType] = useState<RequestType>("Bug Report")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("Medium")
  const [state, setState] = useState<SubmissionState>("idle")
  const [ticketKey, setTicketKey] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const resetForm = () => {
    setRequestType("Bug Report")
    setSubject("")
    setDescription("")
    setPriority("Medium")
    setState("idle")
    setTicketKey("")
    setErrorMessage("")
    setActiveTab("new")
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState("loading")
    setErrorMessage("")

    try {
      // Capture metadata
      const metadata = {
        currentUrl: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch("/api/support/create-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestType,
          subject,
          description,
          priority: requestType === "Bug Report" ? priority : undefined,
          userEmail,
          userName,
          metadata,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request")
      }

      setTicketKey(data.ticketKey)
      setState("success")
    } catch (error) {
      setState("error")
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong"
      )
    }
  }

  // Success View
  if (state === "success") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-6">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <DialogTitle className="text-center text-xl">
                Request Submitted Successfully!
              </DialogTitle>
              <DialogDescription className="text-center">
                Thanks! We&apos;ve received your request.
                {ticketKey && (
                  <>
                    <br />
                    <span className="font-semibold text-foreground">
                      Reference Ticket: {ticketKey}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Form View
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>
            Submit a bug report, feature request, or view your history.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="new">New Request</TabsTrigger>
            <TabsTrigger value="history">My Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="flex-1 space-y-4 data-[state=inactive]:hidden">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Alert */}
              {state === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Request Type */}
              <div className="space-y-3">
                <Label>Request Type</Label>
                <RadioGroup
                  value={requestType}
                  onValueChange={(value) => setRequestType(value as RequestType)}
                  className="grid grid-cols-1 gap-3"
                >
                  <div className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="Bug Report" id="bug" />
                    <Label htmlFor="bug" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Bug Report</div>
                      <div className="text-xs text-muted-foreground">
                        Something isn&apos;t working as expected
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="Feature Request" id="feature" />
                    <Label htmlFor="feature" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Feature Request</div>
                      <div className="text-xs text-muted-foreground">
                        Suggest a new feature or improvement
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="General Question" id="question" />
                    <Label htmlFor="question" className="flex-1 cursor-pointer">
                      <div className="font-semibold">General Question</div>
                      <div className="text-xs text-muted-foreground">
                        Ask us anything about Beespo
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Priority - Only for Bug Reports */}
              {requestType === "Bug Report" && (
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) => setPriority(value as Priority)}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low - Minor issue</SelectItem>
                      <SelectItem value="Medium">
                        Medium - Affects functionality
                      </SelectItem>
                      <SelectItem value="High">
                        High - Blocking or critical
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your request"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={state === "loading"}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Tell us more details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={6}
                  disabled={state === "loading"}
                />
              </div>

              {/* Metadata Info */}
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-semibold mb-1">Auto-captured information:</p>
                <ul className="space-y-0.5">
                  {[
                    "Your name and email",
                    "Current page URL",
                    "Browser and device information"
                  ].map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={state === "loading"}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={state === "loading"}>
                  {state === "loading" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Request
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-[400px] data-[state=inactive]:hidden">
            <RequestHistory />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
