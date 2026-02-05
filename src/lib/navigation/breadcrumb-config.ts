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
    trail: [{ label: "Calendar" }],
  },
  {
    pattern: "/calendar/view",
    trail: [{ label: "Calendar", href: "/calendar/view" }, { label: "View" }],
  },
  {
    pattern: "/calendar/events",
    trail: [{ label: "Calendar", href: "/calendar/view" }, { label: "Events" }],
  },

  // Meetings Hub
  {
    pattern: "/meetings/overview",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Overview" }],
  },
  {
    pattern: "/meetings/schedule",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Schedule" }],
  },
  {
    pattern: "/meetings/business",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Business" }],
  },
  {
    pattern: "/meetings/announcements",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Announcements" }],
  },
  {
    pattern: "/meetings/discussions",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Discussions" }],
  },
  {
    pattern: "/meetings/templates",
    trail: [{ label: "Meetings", href: "/meetings/overview" }, { label: "Templates" }],
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

  // Notebooks (future feature)
  {
    pattern: "/notebooks",
    trail: [{ label: "Notebooks" }],
  },
  {
    pattern: /^\/notebooks\/[^/]+$/,
    trail: [
      { label: "Notebooks", href: "/notebooks" },
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
