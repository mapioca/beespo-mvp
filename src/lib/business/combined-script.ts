import { BUSINESS_CATEGORY_ORDER, isBusinessCategoryKey, type BusinessCategoryKey } from "./categories"
import {
  describeOrdination,
  generateCombinedBusinessScript,
  resolveBusinessMeetingScripts,
  resolveBusinessScriptKey,
} from "./meeting-scripts"

export const BUSINESS_CATEGORY_LABEL: Record<BusinessCategoryKey, string> = {
  sustaining: "Sustaining",
  release: "Release",
  ordination: "Ordination",
  confirmation_ordinance: "Confirmation",
  new_member_welcome: "New Member Welcome",
  child_blessing: "Child Blessing",
  records_received: "Records Received",
  miscellaneous: "Miscellaneous",
}

export const BUSINESS_CATEGORY_PLURAL: Record<BusinessCategoryKey, string> = {
  sustaining: "Sustainings",
  release: "Releases",
  ordination: "Ordinations",
  confirmation_ordinance: "Confirmations",
  new_member_welcome: "New Member Welcomes",
  child_blessing: "Child Blessings",
  records_received: "Records Received",
  miscellaneous: "Miscellaneous",
}

export const BUSINESS_CATEGORY_GLYPH: Record<BusinessCategoryKey, string> = {
  sustaining: "+",
  release: "−",
  ordination: "○",
  confirmation_ordinance: "+",
  new_member_welcome: "+",
  child_blessing: "○",
  records_received: "·",
  miscellaneous: "·",
}

export { BUSINESS_CATEGORY_ORDER, isBusinessCategoryKey }
export type { BusinessCategoryKey }
export { describeOrdination, generateCombinedBusinessScript, resolveBusinessMeetingScripts, resolveBusinessScriptKey }
