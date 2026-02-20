"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { createTable } from "@/lib/actions/table-actions";
import type { TablesData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";
import { useTranslations } from "next-intl";

interface Props {
  data: TablesData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

export function TablesWidget({ data, dragHandleProps, isDragging }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const t = useTranslations("Dashboard.Widgets.tables");

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await createTable({ name: t("untitled") });
      if (result.error) throw new Error(result.error);
      toast.success(t("toastCreated"));
      if (result.data) {
        router.push(`/tables/${result.data.id}`);
      }
    } catch {
      toast.error(t("toastError"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <WidgetCard
      title={t("title")}
      icon={<Table2 className="h-4 w-4 text-muted-foreground" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {data.tables.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            {t("empty")}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreate}
            disabled={creating}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("new")}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {data.tables.map((table) => (
              <Link
                key={table.id}
                href={`/tables/${table.id}`}
                className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <span className="text-base shrink-0">
                  {table.icon || "📊"}
                </span>
                <span className="text-sm font-medium text-gray-900 truncate flex-1">
                  {table.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {t("rows", { count: table.row_count })}
                </span>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <Link
              href="/tables"
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              {t("viewAll")}
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCreate}
              disabled={creating}
              className="h-7 px-2 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              {t("newShort")}
            </Button>
          </div>
        </>
      )}
    </WidgetCard>
  );
}
