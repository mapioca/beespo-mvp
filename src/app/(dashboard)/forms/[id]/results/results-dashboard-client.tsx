"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import {
    ArrowLeft,
    Eye,
    FileText,
    TrendingUp,
    Download,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Form, FormSubmission } from "@/types/form-types";

const ResultsCharts = dynamic(
    () => import("./results-charts").then((m) => m.ResultsCharts),
    {
        ssr: false,
        loading: () => <Skeleton className="h-[300px] w-full rounded-lg" />,
    }
);

interface ResultsDashboardClientProps {
    form: Form;
    submissions: FormSubmission[];
    submissionsOverTime: { date: string; count: number }[];
}

export function ResultsDashboardClient({
    form,
    submissions,
    submissionsOverTime,
}: ResultsDashboardClientProps) {
    const [isTableExpanded, setIsTableExpanded] = useState(true);

    // Calculate field distributions for select/radio fields
    const fieldDistributions = useMemo(() => {
        const distributions: Record<string, Record<string, number>> = {};

        form.schema.fields.forEach((field) => {
            if (field.type === "select" || field.type === "radio") {
                distributions[field.id] = {};
                field.options?.forEach((option) => {
                    distributions[field.id][option] = 0;
                });

                submissions.forEach((submission) => {
                    const value = submission.data[field.id] as string;
                    if (value && distributions[field.id][value] !== undefined) {
                        distributions[field.id][value]++;
                    }
                });
            }
        });

        return distributions;
    }, [form.schema.fields, submissions]);

    // Calculate completion rate
    const completionRate =
        form.views_count > 0
            ? ((submissions.length / form.views_count) * 100).toFixed(1)
            : "0";

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ["Submitted At", ...form.schema.fields.map((f) => f.label)];
        const rows = submissions.map((sub) => [
            format(new Date(sub.submitted_at), "yyyy-MM-dd HH:mm:ss"),
            ...form.schema.fields.map((f) => {
                const value = sub.data[f.id];
                if (typeof value === "boolean") return value ? "Yes" : "No";
                return String(value || "");
            }),
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row) =>
                row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${form.slug}-responses.csv`;
        link.click();
    };

    return (
        <div className="h-full overflow-auto bg-muted/20">
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/forms/${form.id}`}>
                                <ArrowLeft className="h-4 w-4 stroke-[1.6]" />
                                <span className="sr-only">Back to form</span>
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">{form.title}</h1>
                            <p className="text-muted-foreground">Response Analytics</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleExportCSV} className="border-border/60 hover:bg-[hsl(var(--accent-warm)/0.6)]">
                        <Download className="h-4 w-4 mr-2 stroke-[1.6]" />
                        Export CSV
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                            <Eye className="h-4 w-4 text-muted-foreground stroke-[1.6]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{form.views_count}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Submissions
                            </CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground stroke-[1.6]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{submissions.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Completion Rate
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground stroke-[1.6]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{completionRate}%</div>
                        </CardContent>
                    </Card>
                </div>

                <ResultsCharts
                    submissionsOverTime={submissionsOverTime}
                    fieldDistributions={fieldDistributions}
                    fields={form.schema.fields}
                />

                {/* Raw Responses Table */}
                <Collapsible open={isTableExpanded} onOpenChange={setIsTableExpanded}>
                    <Card>
                        <CardHeader>
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <CardTitle>All Responses</CardTitle>
                                        <CardDescription>
                                            {submissions.length} total response
                                            {submissions.length !== 1 ? "s" : ""}
                                        </CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon">
                                        {isTableExpanded ? (
                                            <ChevronUp className="h-4 w-4 stroke-[1.6]" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 stroke-[1.6]" />
                                        )}
                                    </Button>
                                </div>
                            </CollapsibleTrigger>
                        </CardHeader>
                        <CollapsibleContent>
                            <CardContent>
                                {submissions.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No responses yet
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[150px]">Submitted</TableHead>
                                                    {form.schema.fields.map((field) => (
                                                        <TableHead key={field.id}>{field.label}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {submissions.slice(0, 50).map((submission) => (
                                                    <TableRow key={submission.id}>
                                                        <TableCell className="text-muted-foreground">
                                                            {format(
                                                                new Date(submission.submitted_at),
                                                                "MMM d, h:mm a"
                                                            )}
                                                        </TableCell>
                                                        {form.schema.fields.map((field) => {
                                                            const value = submission.data[field.id];
                                                            let displayValue: string;

                                                            if (typeof value === "boolean") {
                                                                displayValue = value ? "Yes" : "No";
                                                            } else {
                                                                displayValue = String(value || "—");
                                                            }

                                                            return (
                                                                <TableCell key={field.id} className="max-w-[200px] truncate">
                                                                    {displayValue}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {submissions.length > 50 && (
                                            <p className="text-sm text-muted-foreground text-center mt-4">
                                                Showing first 50 responses. Export CSV for all data.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            </div>
        </div>
    );
}
