"use client";

import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SchemaField {
  id: string;
  label: string;
  type: string;
}

interface ResultsChartsProps {
  submissionsOverTime: { date: string; count: number }[];
  fieldDistributions: Record<string, Record<string, number>>;
  fields: SchemaField[];
}

export function ResultsCharts({
  submissionsOverTime,
  fieldDistributions,
  fields,
}: ResultsChartsProps) {
  return (
    <>
      {/* Submissions Over Time */}
      <Card className="border-border/50 bg-background/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Submissions Over Time
          </CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={submissionsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), "MMM d")}
                  fontSize={12}
                />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip
                  labelFormatter={(value) =>
                    format(new Date(value), "MMM d, yyyy")
                  }
                  formatter={(value) => [`${value} submissions`, "Count"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--accent-warm-hover))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Field Distributions */}
      {Object.keys(fieldDistributions).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields
            .filter((field) => field.type === "select" || field.type === "radio")
            .map((field) => {
              const distribution = fieldDistributions[field.id];
              const chartData = Object.entries(distribution).map(
                ([option, count]) => ({ option, count })
              );

              return (
                <Card key={field.id} className="border-border/50 bg-background/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {field.label}
                    </CardTitle>
                    <CardDescription>Response distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="option"
                            width={100}
                            fontSize={12}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill="hsl(var(--accent-warm))"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </>
  );
}
