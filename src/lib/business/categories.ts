export type BusinessCategoryKey =
  | "sustaining"
  | "release"
  | "ordination"
  | "confirmation_ordinance"
  | "new_member_welcome"
  | "child_blessing"
  | "records_received"
  | "miscellaneous"

export const BUSINESS_CATEGORY_ORDER: BusinessCategoryKey[] = [
  "sustaining",
  "release",
  "ordination",
  "confirmation_ordinance",
  "new_member_welcome",
  "child_blessing",
  "records_received",
  "miscellaneous",
]

export function isBusinessCategoryKey(value: string): value is BusinessCategoryKey {
  return (BUSINESS_CATEGORY_ORDER as string[]).includes(value)
}
