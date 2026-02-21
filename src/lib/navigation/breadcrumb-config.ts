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
    trail: [{ label: "dashboard" }],
  },

  // Calendar section
  {
    pattern: "/calendar",
    trail: [{ label: "calendar" }],
  },
  {
    pattern: "/calendar/view",
    trail: [{ label: "calendar", href: "/calendar/view" }, { label: "view" }],
  },
  {
    pattern: "/calendar/events",
    trail: [{ label: "calendar", href: "/calendar/view" }, { label: "events" }],
  },

  // Meetings Hub
  {
    pattern: "/meetings/overview",
    trail: [{ label: "meetings", href: "/meetings/overview" }, { label: "overview" }],
  },
  {
    pattern: "/meetings/schedule",
    trail: [{ label: "meetings", href: "/meetings/overview" }, { label: "schedule" }],
  },
  {
    pattern: "/meetings/business",
    trail: [{ label: "meetings", href: "/meetings/overview" }, { label: "business" }],
  },
  {
    pattern: "/meetings/announcements",
    trail: [{ label: "meetings", href: "/meetings/overview" }, { label: "announcements" }],
  },
  {
    pattern: "/meetings/discussions",
    trail: [{ label: "meetings", href: "/meetings/overview" }, { label: "discussions" }],
  },
  {
    pattern: "/meetings/templates",
    trail: [{ label: "meetings", href: "/meetings/overview" }, { label: "templates" }],
  },
  {
    pattern: "/meetings/new",
    trail: [{ label: "meetings", href: "/meetings/overview" }, { label: "newMeeting" }],
  },
  {
    pattern: /^\/meetings\/[^/]+$/,
    trail: [
      { label: "meetings", href: "/meetings/overview" },
      { label: "meetingDetails" },
    ],
    dynamic: true,
  },
  {
    pattern: /^\/meetings\/[^/]+\/conduct$/,
    trail: [
      { label: "meetings", href: "/meetings/overview" },
      { label: "conductMeeting" },
    ],
    dynamic: true,
  },

  // Notebooks (future feature)
  {
    pattern: "/notebooks",
    trail: [{ label: "notebooks" }],
  },
  {
    pattern: /^\/notebooks\/[^/]+$/,
    trail: [
      { label: "notebooks", href: "/notebooks" },
      { label: "notebook" },
    ],
    dynamic: true,
  },

  // Directory section (consolidated)
  {
    pattern: "/directory",
    trail: [{ label: "directory" }],
  },
  {
    pattern: "/callings",
    trail: [{ label: "directory", href: "/directory" }, { label: "callings" }],
  },
  {
    pattern: /^\/callings\/[^/]+$/,
    trail: [
      { label: "directory", href: "/directory" },
      { label: "callings", href: "/callings" },
      { label: "callingDetails" },
    ],
    dynamic: true,
  },
  {
    pattern: "/speakers",
    trail: [{ label: "directory", href: "/directory" }, { label: "speakers" }],
  },
  {
    pattern: /^\/speakers\/[^/]+$/,
    trail: [
      { label: "directory", href: "/directory" },
      { label: "speakers", href: "/speakers" },
      { label: "speakerDetails" },
    ],
    dynamic: true,
  },
  {
    pattern: "/participants",
    trail: [{ label: "directory", href: "/directory" }, { label: "participants" }],
  },
  {
    pattern: /^\/participants\/[^/]+$/,
    trail: [
      { label: "directory", href: "/directory" },
      { label: "participants", href: "/participants" },
      { label: "participantDetails" },
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
