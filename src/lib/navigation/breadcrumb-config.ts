/**
 * Breadcrumb configuration for navigation
 * Maps route patterns to their breadcrumb trails
 */

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbConfig {
  pattern: string | RegExp
  trail: BreadcrumbItem[]
  dynamic?: boolean
}

export const breadcrumbConfigs: BreadcrumbConfig[] = [
  // Dashboard
  {
    pattern: "/dashboard",
    trail: [{ label: "Dashboard" }],
  },
  {
    pattern: "/inbox",
    trail: [{ label: "Workspace", href: "/dashboard" }, { label: "Inbox" }],
  },

  // Calendar section
  {
    pattern: "/calendar",
    trail: [{ label: "Calendar", href: "/calendar" }],
  },
  {
    pattern: "/calendar/events",
    trail: [{ label: "Calendar", href: "/calendar" }, { label: "Events" }],
  },
  {
    pattern: /^\/calendar\/events\/[^/]+$/,
    trail: [{ label: "Calendar", href: "/calendar" }, { label: "Events", href: "/calendar/events" }, { label: "Event Details" }],
    dynamic: true,
  },
  {
    pattern: "/calendar/settings",
    trail: [{ label: "Calendar", href: "/calendar" }, { label: "Settings" }],
  },
  {
    pattern: "/schedule",
    trail: [{ label: "Schedule", href: "/schedule/calendar" }, { label: "Calendar" }],
  },
  {
    pattern: "/schedule/calendar",
    trail: [{ label: "Schedule", href: "/schedule/calendar" }, { label: "Calendar" }],
  },
  {
    pattern: "/schedule/events",
    trail: [{ label: "Schedule", href: "/schedule/calendar" }, { label: "Events" }],
  },
  {
    pattern: "/schedule/settings",
    trail: [{ label: "Schedule", href: "/schedule/calendar" }, { label: "Settings" }],
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
    pattern: "/meetings/sacrament/speakers",
    trail: [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Sacrament Meeting", href: "/meetings/sacrament/planner" },
      { label: "Speaker Planner" },
    ],
  },
  {
    pattern: "/meetings/sacrament/business",
    trail: [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Sacrament Meeting", href: "/meetings/sacrament/planner" },
      { label: "Business" },
    ],
  },
  {
    pattern: "/meetings/sacrament/business/new",
    trail: [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Sacrament Meeting", href: "/meetings/sacrament/planner" },
      { label: "Business", href: "/meetings/sacrament/business" },
      { label: "New Business" },
    ],
  },
  {
    pattern: "/meetings/sacrament/archive",
    trail: [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Sacrament Meeting", href: "/meetings/sacrament/planner" },
      { label: "Archive" },
    ],
  },
  {
    pattern: "/meetings/sacrament/confirmations",
    trail: [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Sacrament Meeting", href: "/meetings/sacrament/planner" },
      { label: "Confirmations" },
    ],
  },
  {
    pattern: "/discussions",
    trail: [
      { label: "Discussions" },
    ],
  },
  {
    pattern: "/discussions/new",
    trail: [
      { label: "Discussions", href: "/discussions" },
      { label: "New Discussion" },
    ],
  },
  {
    pattern: /^\/discussions\/[^/]+$/,
    trail: [
      { label: "Discussions", href: "/discussions" },
      { label: "Discussion Details" },
    ],
    dynamic: true,
  },
  {
    pattern: "/meetings/sacrament/announcements",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Announcements" }],
  },
  {
    pattern: "/meetings/assignments",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Assignments" }],
  },
  {
    pattern: "/library",
    trail: [
      { label: "Templates", href: "/library" },
      { label: "All Templates" },
    ],
  },
  {
    pattern: "/library/programs",
    trail: [
      { label: "Templates", href: "/library" },
      { label: "Programs" },
    ],
  },
  {
    pattern: "/library/agendas",
    trail: [
      { label: "Templates", href: "/library" },
      { label: "Agendas" },
    ],
  },
  {
    pattern: "/library/forms",
    trail: [
      { label: "Templates", href: "/library" },
      { label: "Forms" },
    ],
  },
  {
    pattern: "/library/new",
    trail: [
      { label: "Templates", href: "/library" },
      { label: "All Templates", href: "/library" },
      { label: "New Template" },
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
  {
    pattern: /^\/meetings\/agenda\/[^/]+$/,
    trail: [
      { label: "Meetings", href: "/meetings/overview" },
      { label: "Agendas", href: "/meetings/agendas" },
      { label: "Agenda" },
    ],
    dynamic: true,
  },

  // Data section
  {
    pattern: "/data",
    trail: [{ label: "Data", href: "/data" }, { label: "Overview" }],
  },
  {
    pattern: "/forms",
    trail: [{ label: "Data", href: "/data" }, { label: "Forms" }],
  },
  {
    pattern: "/forms/new",
    trail: [
      { label: "Data", href: "/data" },
      { label: "Forms", href: "/forms" },
      { label: "New Form" },
    ],
  },
  {
    pattern: /^\/forms\/[^/]+$/,
    trail: [
      { label: "Data", href: "/data" },
      { label: "Forms", href: "/forms" },
      { label: "Form Details" },
    ],
    dynamic: true,
  },
  {
    pattern: "/tables",
    trail: [{ label: "Data", href: "/data" }, { label: "Tables" }],
  },
  {
    pattern: "/tables/new",
    trail: [{ label: "Data", href: "/data" }, { label: "Tables", href: "/tables" }, { label: "New Table" }],
  },
  {
    pattern: /^\/tables\/[^/]+$/,
    trail: [
      { label: "Data", href: "/data" },
      { label: "Tables", href: "/tables" },
      { label: "Table" },
    ],
    dynamic: true,
  },

  // Notebooks
  {
    pattern: "/notebooks",
    trail: [{ label: "Data", href: "/data" }, { label: "Notebooks" }],
  },
  {
    pattern: "/notebooks/new",
    trail: [{ label: "Data", href: "/data" }, { label: "Notebooks", href: "/notebooks" }, { label: "New Notebook" }],
  },
  {
    pattern: /^\/notebooks\/[^/]+$/,
    trail: [
      { label: "Data", href: "/data" },
      { label: "Notebooks", href: "/notebooks" },
      { label: "Notebook" },
    ],
    dynamic: true,
  },

  // Directory section
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
]

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

  return []
}
