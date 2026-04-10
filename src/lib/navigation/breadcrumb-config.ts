/**
 * Breadcrumb configuration for navigation
 * Maps route patterns to their breadcrumb trails
 */

export interface BreadcrumbItem {
  label: string
  href?: string
  iconType?: "database" | "table" | "notebook" | "template"
}

export interface BreadcrumbConfig {
  pattern: string | RegExp
  trail: BreadcrumbItem[]
  /**
   * Optional function to dynamically generate the trail
   * Useful for routes with dynamic segments like [id]
   */
  dynamic?: boolean
}

/**
 * Static breadcrumb configurations for routes
 */
export const breadcrumbConfigs: BreadcrumbConfig[] = [
  // Dashboard
  {
    pattern: "/dashboard",
    trail: [{ label: "Dashboard" }],
  },

  // Calendar section
  {
    pattern: "/calendar",
    trail: [{ label: "Schedule", href: "/calendar/view" }, { label: "Calendar" }],
  },
  {
    pattern: "/calendar/view",
    trail: [{ label: "Schedule", href: "/calendar/view" }, { label: "Calendar" }],
  },
  {
    pattern: "/calendar/events",
    trail: [{ label: "Schedule", href: "/calendar/view" }, { label: "Events" }],
  },
  {
    pattern: "/calendar/settings",
    trail: [{ label: "Schedule", href: "/calendar/view" }, { label: "Settings" }],
  },

  // Meetings Hub
  {
    pattern: "/meetings/overview",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Overview" }],
  },
  {
    pattern: "/meetings/agendas",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Agendas" }],
  },
  {
    pattern: "/meetings/programs",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Programs" }],
  },
  {
    pattern: "/meetings/business",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Business" }],
  },
  {
    pattern: "/meetings/discussions",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Discussions" }],
  },
  {
    pattern: "/meetings/directory",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Directory" }],
  },
  {
    pattern: "/meetings/participants",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Participants" }],
  },
  {
    pattern: "/meetings/speakers",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Speakers" }],
  },
  {
    pattern: "/meetings/announcements",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Announcements" }],
  },
  {
    pattern: "/meetings/assignments",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Assignments" }],
  },
  {
    pattern: "/templates/library",
    trail: [
      { label: "Templates", href: "/templates/library", iconType: "template" },
      { label: "Library", iconType: "template" },
    ],
  },
  {
    pattern: "/templates/new",
    trail: [
      { label: "Templates", href: "/templates/library", iconType: "template" },
      { label: "Library", href: "/templates/library", iconType: "template" },
      { label: "New Template", iconType: "template" },
    ],
  },
  {
    pattern: "/meetings/new",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "New Meeting" }],
  },
  {
    pattern: /^\/meetings\/[^/]+$/,
    trail: [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Meeting Details" },
    ],
    dynamic: true,
  },
  {
    pattern: /^\/meetings\/[^/]+\/conduct$/,
    trail: [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Conduct Meeting" },
    ],
    dynamic: true,
  },

  // Data section
  {
    pattern: "/tables",
    trail: [{ label: "Data", iconType: "database" }, { label: "Tables", iconType: "table" }],
  },
  {
    pattern: "/tables/new",
    trail: [{ label: "Data", iconType: "database" }, { label: "Tables", href: "/tables", iconType: "table" }, { label: "New Table" }],
  },
  {
    pattern: /^\/tables\/[^/]+$/,
    trail: [
      { label: "Data", iconType: "database" },
      { label: "Tables", href: "/tables", iconType: "table" },
      { label: "Table", iconType: "table" },
    ],
    dynamic: true,
  },

  // Notebooks
  {
    pattern: "/notebooks",
    trail: [{ label: "Data", iconType: "database" }, { label: "Notebooks", iconType: "notebook" }],
  },
  {
    pattern: "/notebooks/new",
    trail: [{ label: "Data", iconType: "database" }, { label: "Notebooks", href: "/notebooks", iconType: "notebook" }, { label: "New Notebook" }],
  },
  {
    pattern: /^\/notebooks\/[^/]+$/,
    trail: [
      { label: "Data", iconType: "database" },
      { label: "Notebooks", href: "/notebooks", iconType: "notebook" },
      { label: "Notebook" },
    ],
    dynamic: true,
  },

  // Directory section (consolidated)
  {
    pattern: "/directory",
    trail: [{ label: "Directory" }],
  },
  {
    pattern: "/callings",
    trail: [{ label: "Directory", href: "/directory" }, { label: "Callings" }],
  },
  {
    pattern: /^\/callings\/[^/]+$/,
    trail: [
      { label: "Directory", href: "/directory" },
      { label: "Callings", href: "/callings" },
      { label: "Calling Details" },
    ],
    dynamic: true,
  },
  {
    pattern: "/speakers",
    trail: [{ label: "Directory", href: "/directory" }, { label: "Speakers" }],
  },
  {
    pattern: /^\/speakers\/[^/]+$/,
    trail: [
      { label: "Directory", href: "/directory" },
      { label: "Speakers", href: "/speakers" },
      { label: "Speaker Details" },
    ],
    dynamic: true,
  },
  {
    pattern: "/participants",
    trail: [{ label: "Directory", href: "/directory" }, { label: "Participants" }],
  },
  {
    pattern: /^\/participants\/[^/]+$/,
    trail: [
      { label: "Directory", href: "/directory" },
      { label: "Participants", href: "/participants" },
      { label: "Participant Details" },
    ],
    dynamic: true,
  },
]

/**
 * Get the breadcrumb trail for a given pathname
 */
export function getBreadcrumbTrail(pathname: string): BreadcrumbItem[] {
  for (const config of breadcrumbConfigs) {
    if (typeof config.pattern === "string") {
      if (pathname === config.pattern) {
        return config.trail
      }
    } else if (config.pattern.test(pathname)) {
      return config.trail
    }
  }

  // Default: return empty trail
  return []
}
