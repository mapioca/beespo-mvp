"use client"

import * as React from "react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { ArrowDown, ArrowUp, EyeOff, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterOption {
    value: string
    label: string
    count?: number
}

export interface DataTableColumnHeaderProps {
    label: string
    /** Whether a sort is active on this column */
    sortActive?: boolean
    /** Current sort direction when active */
    sortDirection?: "asc" | "desc"
    /** Called when user clicks sort ascending */
    onSortAsc?: () => void
    /** Called when user clicks sort descending */
    onSortDesc?: () => void
    /** Show a search input in the popover */
    searchable?: boolean
    searchValue?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
    /** Filter options rendered as checkboxes */
    filterOptions?: FilterOption[]
    selectedFilters?: string[]
    onFilterToggle?: (value: string) => void
    /** Called when user clicks hide column */
    onHide?: () => void
    className?: string
}

export function DataTableColumnHeader({
    label,
    sortActive,
    sortDirection,
    onSortAsc,
    onSortDesc,
    searchable,
    searchValue,
    onSearchChange,
    searchPlaceholder,
    filterOptions,
    selectedFilters = [],
    onFilterToggle,
    onHide,
    className,
}: DataTableColumnHeaderProps) {
    const [open, setOpen] = React.useState(false)
    const hasActiveFilter =
        selectedFilters.length > 0 ||
        (searchValue !== undefined && searchValue.length > 0)

    return (
        <th
            className={cn(
                "h-10 px-3 text-left align-middle",
                "text-[11px] uppercase tracking-wider font-semibold text-muted-foreground",
                "[&:has([role=checkbox])]:pr-0",
                className
            )}
        >
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        className={cn(
                            "inline-flex items-center gap-1.5 -mx-1.5 px-1.5 py-1 rounded transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            open && "bg-accent text-accent-foreground",
                            hasActiveFilter && "text-foreground"
                        )}
                    >
                        {label}
                        {sortActive &&
                            (sortDirection === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                            ) : (
                                <ArrowDown className="h-3 w-3" />
                            ))}
                        {hasActiveFilter && !sortActive && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-[220px] p-0"
                >
                    <div className="flex flex-col">
                        {/* Search */}
                        {searchable && onSearchChange && (
                            <div className="p-2 border-b">
                                <Input
                                    placeholder={
                                        searchPlaceholder || "Search..."
                                    }
                                    value={searchValue || ""}
                                    onChange={(e) =>
                                        onSearchChange(e.target.value)
                                    }
                                    className="h-8 text-sm"
                                />
                            </div>
                        )}

                        {/* Sort Options */}
                        <div className="p-1">
                            {onSortAsc && (
                                <button
                                    onClick={() => {
                                        onSortAsc()
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                                        sortActive &&
                                            sortDirection === "asc" &&
                                            "bg-accent"
                                    )}
                                >
                                    <ArrowUp className="h-4 w-4" />
                                    Sort ascending
                                </button>
                            )}
                            {onSortDesc && (
                                <button
                                    onClick={() => {
                                        onSortDesc()
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                                        sortActive &&
                                            sortDirection === "desc" &&
                                            "bg-accent"
                                    )}
                                >
                                    <ArrowDown className="h-4 w-4" />
                                    Sort descending
                                </button>
                            )}
                        </div>

                        {/* Filter Options */}
                        {filterOptions &&
                            filterOptions.length > 0 &&
                            onFilterToggle && (
                                <>
                                    <div className="border-t" />
                                    <div className="p-1">
                                        <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                                            Filter
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto">
                                            {filterOptions.map((option) => {
                                                const isSelected =
                                                    selectedFilters.includes(
                                                        option.value
                                                    )
                                                return (
                                                    <button
                                                        key={option.value}
                                                        onClick={() =>
                                                            onFilterToggle(
                                                                option.value
                                                            )
                                                        }
                                                        className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={cn(
                                                                    "h-4 w-4 rounded-sm border flex items-center justify-center",
                                                                    isSelected
                                                                        ? "bg-primary border-primary"
                                                                        : "border-input"
                                                                )}
                                                            >
                                                                {isSelected && (
                                                                    <Check className="h-3 w-3 text-primary-foreground" />
                                                                )}
                                                            </div>
                                                            <span>
                                                                {option.label}
                                                            </span>
                                                        </div>
                                                        {option.count !==
                                                            undefined && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {option.count}
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}

                        {/* Hide Column */}
                        {onHide && (
                            <>
                                <div className="border-t" />
                                <div className="p-1">
                                    <button
                                        onClick={() => {
                                            onHide()
                                            setOpen(false)
                                        }}
                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                    >
                                        <EyeOff className="h-4 w-4" />
                                        Hide column
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </th>
    )
}
