# UI Table Replication Guide (Tasks Style)

This guide describes how to replicate the UI table style used in the Tasks section (e.g., Filtering, Sorting, ID prefixing) for other entities like Business, Announcement, Speakers, and Discussions.

## Architecture Overview

Use a **Modular Client/Table/Filter** pattern:
1.  **`[entity]-client.tsx`**: Manages state (filters, sorting) and filters the data.
2.  **`[entity]-table.tsx`**: Renders the UI table and handles row-level interactions.
3.  **`[entity]-filters.tsx`**: Contains the search bar and faceted filter dropdowns.

---

## 1. The ID Prefix Standard

Each entity should have a unique workspace-level identifier format used in the first column:
- **Tasks**: `TASK-XXXX`
- **Speakers**: `SPKR-XXXX`
- **Announcements**: `ANNC-XXXX`
- **Business**: `BIZ-XXXX`
- **Discussions**: `DISC-XXXX`

---

## 2. Component Templates

### A. Filter Component (`[entity]-filters.tsx`)
This component should handle the search input and faceted filters.

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { CirclePlus, CheckCircle2, X } from "lucide-react";

export function EntityFilters({ onFilterChange, counts }: any) {
    const [search, setSearch] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    
    const updateFilters = (newSearch: string, newStatuses: string[]) => {
        onFilterChange({ search: newSearch, status: newStatuses });
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Input 
                placeholder="Filter by title or ID..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); updateFilters(e.target.value, selectedStatuses); }}
                className="max-w-xs"
            />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 border-dashed">
                        <CirclePlus className="mr-2 h-4 w-4" />
                        Status
                        {selectedStatuses.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {selectedStatuses.length}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px] p-2">
                     {['active', 'inactive'].map(status => (
                        <div key={status} onClick={() => {
                             const newSet = selectedStatuses.includes(status) 
                                ? selectedStatuses.filter(s => s !== status)
                                : [...selectedStatuses, status];
                             setSelectedStatuses(newSet);
                             updateFilters(search, newSet);
                        }} className="cursor-pointer flex items-center p-2 hover:bg-muted rounded-sm">
                            <div className={`mr-2 h-4 w-4 border rounded-sm flex items-center justify-center ${selectedStatuses.includes(status) ? 'bg-primary border-primary' : 'border-input'}`}>
                                {selectedStatuses.includes(status) && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <span className="capitalize">{status}</span>
                        </div>
                     ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {(search || selectedStatuses.length > 0) && (
                <Button variant="ghost" onClick={() => { setSearch(""); setSelectedStatuses([]); updateFilters("", []); }}>
                    Reset <X className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
```

### B. Table Component (`[entity]-table.tsx`)
This component displays the data with sortable headers.

```tsx
"use client";

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SortHeader = ({ label, column, sortConfig, onSort }: any) => (
    <TableHead onClick={() => onSort(column)} className="cursor-pointer hover:bg-muted/50 transition-colors">
        <div className="flex items-center space-x-1">
            <span>{label}</span>
            {sortConfig?.key === column ? (
                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            ) : <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />}
        </div>
    </TableHead>
);

export function EntityTable({ data, sortConfig, onSort }: any) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="group">
                        <SortHeader label="ID" column="workspace_id" sortConfig={sortConfig} onSort={onSort} />
                        <SortHeader label="Title" column="title" sortConfig={sortConfig} onSort={onSort} />
                        <SortHeader label="Status" column="status" sortConfig={sortConfig} onSort={onSort} />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item: any) => (
                        <TableRow key={item.id} className="group hover:bg-muted/50">
                            <TableCell className="font-mono text-xs text-muted-foreground uppercase">
                                {item.workspace_entity_id || 'ENT-0000'} 
                            </TableCell>
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span>{item.title}</span>
                                    {item.description && (
                                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                            {item.description}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">
                                    {item.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">No results found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
```

### C. Client Component (`[entity]-client.tsx`)
The glue that manages filtering and sorting state.

```text
"use client";

import { useState, useMemo } from "react";
import { EntityFilters } from "./[entity]-filters";
import { EntityTable } from "./[entity]-table";

export function EntityClient({ initialData }: any) {
    const [filters, setFilters] = useState({ search: "", status: [] as string[] });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const filteredData = useMemo(() => {
        const result = initialData.filter((item: any) => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                if (!item.title.toLowerCase().includes(searchLower) && 
                    !item.workspace_entity_id?.toLowerCase().includes(searchLower)) return false;
            }
            if (filters.status.length > 0 && !filters.status.includes(item.status)) return false;
            return true;
        });

        if (sortConfig) {
            result.sort((a: any, b: any) => {
                 const aValue = a[sortConfig.key];
                 const bValue = b[sortConfig.key];
                 if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                 if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                 return 0;
            });
        }
        return result;
    }, [initialData, filters, sortConfig]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Section Title</h1>
            </div>
            
            <EntityFilters onFilterChange={setFilters} />
            
            <EntityTable 
                data={filteredData} 
                sortConfig={sortConfig}
                onSort={(key: string) => {
                    setSortConfig(current => {
                        if (current?.key === key) {
                            return current.direction === 'asc' ? { key, direction: 'desc' } : null;
                        }
                        return { key, direction: 'asc' };
                    });
                }}
            />
        </div>
    );
}
```

---

## Key Style Guidelines

1.  **Typography**: Use `text-sm` for table content, `font-medium` for names/titles, and `font-mono text-xs uppercase` for IDs.
2.  **Visual Interaction**: Use `group-hover:bg-muted/50` on table rows for a premium feel.
3.  **Dropdowns**: Use `DropdownMenu` with `border-dashed` buttons for filters to match the `shadcn/ui` aesthetic.
4.  **Consistency**: Ensure column widths are consistent across sections (e.g., ID column is usually around `100px`).
