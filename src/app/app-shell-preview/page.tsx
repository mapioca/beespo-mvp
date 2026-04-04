import { Plus, Filter, FileText, Inbox } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sampleRows = [
  { name: "Sunday Coordination", owner: "Emma Carter", status: "Active", due: "Apr 9" },
  { name: "Leadership Interviews", owner: "Noah Brooks", status: "Review", due: "Apr 12" },
  { name: "Youth Program", owner: "Ava Morales", status: "Draft", due: "Apr 15" },
  { name: "Community Outreach", owner: "Liam Turner", status: "Active", due: "Apr 18" },
  { name: "Quarterly Planning", owner: "Sophia Patel", status: "Blocked", due: "Apr 21" },
];

function EmptyStatePreview() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
      <Inbox className="mx-auto mb-4 h-6 w-6 text-muted-foreground" />
      <h3 className="text-lg font-semibold text-foreground">No pending items</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        You are all caught up. Create a new item to validate empty-state spacing and hierarchy.
      </p>
      <div className="mt-6">
        <Button>
          <Plus className="h-4 w-4" />
          Create item
        </Button>
      </div>
    </div>
  );
}

export default function AppShellPreviewPage() {
  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title="App Shell Preview"
        description="Validation checkpoint for navigation, tokens, hierarchy, and component consistency."
        breadcrumbs={[
          { label: "Home", href: "/app-shell-preview" },
          { label: "Preview" },
        ]}
        actions={
          <>
            <Button variant="outline">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button>
              <Plus className="h-4 w-4" />
              Primary action
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
            <CardDescription>Overall weekly execution health.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">87%</p>
            <p className="mt-1 text-sm text-muted-foreground">+4.2% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Assignments</CardTitle>
            <CardDescription>Items waiting for owners.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">12</p>
            <p className="mt-1 text-sm text-muted-foreground">3 require review today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
            <CardDescription>Scheduled in the next 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">6</p>
            <p className="mt-1 text-sm text-muted-foreground">2 have pending agenda items</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Sample Table</CardTitle>
            <CardDescription>Representative data-heavy view.</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleRows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.owner}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-right">{row.due}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmptyStatePreview />

      <Card>
        <CardHeader>
          <CardTitle>Buttons, Form, and Tags</CardTitle>
          <CardDescription>Interactive primitives aligned to tokenized styles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-foreground">
                Title
              </label>
              <Input id="title" placeholder="Enter title" />
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium text-foreground">
                Category
              </label>
              <Select defaultValue="meeting">
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="calling">Calling</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-foreground">
              Notes
            </label>
            <Textarea id="notes" placeholder="Add context and details" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Error</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
