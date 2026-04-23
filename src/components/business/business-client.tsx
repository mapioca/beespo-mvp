"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Plus } from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { prefetchBusinessFormData } from "@/lib/cache/form-data-cache"
import { toast } from "@/lib/toast"
import { TopbarSearchAction } from "@/components/ui/topbar-search-action"

import { BusinessItem } from "./business-table"
import { BusinessDetailsPanel } from "./business-details-panel"
import { BusinessItemForm, BusinessItemFormData } from "./business-item-form"
import { BusinessPendingView } from "./pending/business-pending-view"

interface BusinessClientProps {
  items: BusinessItem[]
}

export function BusinessClient({ items }: BusinessClientProps) {
  const router = useRouter()

  const [selectedItem, setSelectedItem] = useState<BusinessItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newBusinessModalOpen, setNewBusinessModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    prefetchBusinessFormData()
  }, [])

  const handleViewItem = (item: BusinessItem) => {
    setSelectedItem(item)
    setDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("business_items") as any)
      .delete()
      .eq("id", id)

    if (error) {
      toast.error(error.message || "Failed to delete business item")
    } else {
      toast.success("Business item deleted successfully")
      router.refresh()
    }
  }

  const handleCreateBusinessItem = async (formData: BusinessItemFormData) => {
    setIsCreating(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Not authenticated. Please log in again.")
      setIsCreating(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("workspace_id, role")
      .eq("id", user.id)
      .single()

    if (!profile || !["leader", "admin"].includes(profile.role)) {
      toast.error("Only leaders and admins can create business items.")
      setIsCreating(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: businessItem, error: createError } = await (supabase.from("business_items") as any)
      .insert({
        person_name: formData.personName,
        position_calling: formData.positionCalling,
        category: formData.category,
        status: formData.status,
        action_date: formData.actionDate || null,
        notes: formData.notes || null,
        details: formData.details,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (createError || !businessItem) {
      toast.error(createError?.message || "Failed to create business item.")
      setIsCreating(false)
      return
    }

    if (formData.templateIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: linkError } = await (supabase.from("business_templates") as any)
        .insert(
          formData.templateIds.map((templateId) => ({
            business_item_id: businessItem.id,
            template_id: templateId,
          }))
        )
      if (linkError) {
        toast.warning("Created, but could not link to template.")
      }
    }

    toast.success("Business item created successfully!")
    setIsCreating(false)
    setNewBusinessModalOpen(false)
    router.refresh()
  }

  const searchable = search
    ? items.filter((item) => {
        const q = search.toLowerCase()
        return (
          item.person_name?.toLowerCase().includes(q) ||
          item.position_calling?.toLowerCase().includes(q)
        )
      })
    : items

  return (
    <div className="flex h-full flex-col bg-surface-canvas">
      <Breadcrumbs
        items={[
          { label: "<- Back to the Planner", href: "/meetings/sacrament-meeting/program-planner" },
          { label: "Business", icon: <Briefcase className="h-4 w-4 stroke-[1.6]" /> },
        ]}
        className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
        action={
          <div className="hidden items-center gap-1 sm:flex">
            <TopbarSearchAction
              value={search}
              onChange={setSearch}
              placeholder="Search business..."
              items={searchable.slice(0, 8).map((item) => ({
                id: item.id,
                label: item.person_name,
                actionLabel: "Open",
              }))}
              onSelect={(itemId) => {
                const selected = searchable.find((item) => item.id === itemId)
                if (!selected) return
                handleViewItem(selected)
              }}
              emptyText="No matching business items."
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewBusinessModalOpen(true)}
              onMouseEnter={() => prefetchBusinessFormData()}
              onFocus={() => prefetchBusinessFormData()}
              className="h-7 gap-1 rounded-full px-2.5 text-[length:var(--agenda-control-font-size)] text-nav transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
              New business
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <BusinessPendingView items={searchable} onOpenItem={handleViewItem} />
      </div>

      <Dialog open={newBusinessModalOpen} onOpenChange={setNewBusinessModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="px-5 py-4 space-y-3">
            <DialogTitle>New Business Item</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Add a formal church procedure to track. The conducting script is generated automatically.
            </p>
          </DialogHeader>
          <BusinessItemForm
            onSubmit={handleCreateBusinessItem}
            isLoading={isCreating}
            mode="create"
            onCancel={() => setNewBusinessModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <BusinessDetailsPanel
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onDelete={handleDelete}
      />
    </div>
  )
}
