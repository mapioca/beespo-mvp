import type { BusinessItem } from "@/components/business/business-table"
import {
  defaultConductScriptTemplate,
  renderConductScriptTemplate,
  type ConductScriptKey,
  type ConductScriptTemplateMap,
} from "@/lib/conduct-script-templates"
import {
  formatOffice,
  formatPriesthood,
  getPriesthoodFromOffice,
  generateBusinessScript,
  type Language,
} from "@/lib/business-script-generator"

import {
  BUSINESS_CATEGORY_ORDER,
  isBusinessCategoryKey,
  type BusinessCategoryKey,
} from "./categories"

export type ResolvedBusinessMeetingScript = {
  category: BusinessCategoryKey
  scriptKey: ConductScriptKey
  template: string
  templateSnapshot: string
  renderedScript: string
  businessItemIds: string[]
  items: BusinessItem[]
}

function joinWithSeriesComma(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ""
  if (parts.length === 2) return `${parts[0]}, and ${parts[1]}`
  const head = parts.slice(0, -1).join(", ")
  return `${head}, and ${parts[parts.length - 1]}`
}

function joinSpanishSeries(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ""
  if (parts.length === 2) return `${parts[0]}, y ${parts[1]}`
  const head = parts.slice(0, -1).join(", ")
  return `${head}, y ${parts[parts.length - 1]}`
}

function getSubjectPronoun(gender?: "male" | "female" | null, language: Language = "ENG"): string {
  if (language === "SPA") return gender === "female" ? "ella" : "él"
  return gender === "female" ? "she" : "he"
}

function getObjectPronoun(gender?: "male" | "female" | null, language: Language = "ENG"): string {
  if (language === "SPA") return gender === "female" ? "ella" : "él"
  return gender === "female" ? "her" : "him"
}

function getPossessivePronoun(gender?: "male" | "female" | null, language: Language = "ENG"): string {
  if (language === "SPA") return "su"
  return gender === "female" ? "her" : "his"
}

function dominantLanguage(items: BusinessItem[], languageOverride?: Language): Language {
  if (languageOverride) return languageOverride
  const spanish = items.filter((item) => item.details?.language === "SPA").length
  return spanish > items.length / 2 ? "SPA" : "ENG"
}

export function resolveBusinessScriptKey(
  category: BusinessCategoryKey,
  itemCount: number
): ConductScriptKey {
  if (itemCount > 1) {
    if (category === "sustaining") return "ward-business.sustaining_multiple"
    if (category === "release") return "ward-business.release_multiple"
    if (category === "records_received") return "ward-business.records_received_multiple"
  }

  return `ward-business.${category}` as ConductScriptKey
}

export function buildBusinessScriptTemplateVariables(
  category: BusinessCategoryKey,
  items: BusinessItem[],
  languageOverride?: Language
): Record<string, string> {
  const language = dominantLanguage(items, languageOverride)
  const names = items.map((item) => item.person_name.trim()).filter(Boolean)
  const primary = items[0]
  const nameList = language === "SPA" ? joinSpanishSeries(names) : joinWithSeriesComma(names)
  const memberNames = names.join("\n")
  const callingPhrases = items.map((item) => {
    const calling = item.position_calling || (language === "SPA" ? "[Llamamiento]" : "[Calling]")
    return language === "SPA"
      ? `${item.person_name} como ${calling}`
      : `${item.person_name} as ${calling}`
  })
  const ordinationPhrases = items.map((item) => {
    const office = item.details?.office
    const officeText = office
      ? formatOffice(office, language)
      : language === "SPA"
        ? "[Oficio]"
        : "[Office]"
    return language === "SPA"
      ? `${item.person_name} al oficio de ${officeText}`
      : `${item.person_name} to the office of ${officeText}`
  })

  return {
    personName: primary?.person_name || "",
    personNames: nameList,
    memberNames,
    calling: primary?.position_calling || "",
    callingPhrases: language === "SPA" ? joinSpanishSeries(callingPhrases) : joinWithSeriesComma(callingPhrases),
    office: primary?.details?.office ? formatOffice(primary.details.office, language) : "",
    ordinationPhrases: language === "SPA" ? joinSpanishSeries(ordinationPhrases) : joinWithSeriesComma(ordinationPhrases),
    baptismDate: primary?.details?.baptismDate || "",
    confirmationDate: primary?.details?.confirmationDate || "",
    childName: primary?.details?.childName || primary?.person_name || "",
    voiceName: primary?.details?.voiceName || "",
    subjectPronoun: getSubjectPronoun(primary?.details?.gender, language),
    objectPronoun: items.length > 1 ? (language === "SPA" ? "ellos" : "them") : getObjectPronoun(primary?.details?.gender, language),
    possessivePronoun: items.length > 1 ? (language === "SPA" ? "su" : "their") : getPossessivePronoun(primary?.details?.gender, language),
    customText: items
      .map((item) => item.details?.customText || item.details?.customScript || item.notes || "")
      .filter(Boolean)
      .join("\n\n"),
  }
}

function sustainingCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  const templateKey = resolveBusinessScriptKey("sustaining", items.length)
  const template = scriptTemplates?.[templateKey] ?? defaultConductScriptTemplate(templateKey, language)
  return renderConductScriptTemplate(template, buildBusinessScriptTemplateVariables("sustaining", items, language))
}

function releaseCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  const templateKey = resolveBusinessScriptKey("release", items.length)
  const template = scriptTemplates?.[templateKey] ?? defaultConductScriptTemplate(templateKey, language)
  return renderConductScriptTemplate(template, buildBusinessScriptTemplateVariables("release", items, language))
}

function ordinationCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  const templateKey = resolveBusinessScriptKey("ordination", items.length)
  const template = scriptTemplates?.[templateKey] ?? defaultConductScriptTemplate(templateKey, language)
  return renderConductScriptTemplate(template, buildBusinessScriptTemplateVariables("ordination", items, language))
}

function newMemberWelcomeCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  if (items.length === 1) {
    return generateBusinessScript(items[0], languageOverride, scriptTemplates)
  }

  const names = items.map((item) => item.person_name)
  if (language === "SPA") {
    const nameList = joinSpanishSeries(names)
    const verb = items.length === 1 ? "ha sido" : "han sido"
    const baptizedConfirmed = items.length === 1 ? "bautizado y confirmado" : "bautizados y confirmados"
    return `${nameList} ${verb} ${baptizedConfirmed} miembro${items.length === 1 ? "" : "s"} de La Iglesia de Jesucristo de los Santos de los Últimos Días. Les pedimos que muestren con la mano levantada que les dan la bienvenida al barrio.`
  }

  const nameList = joinWithSeriesComma(names)
  const verb = items.length === 1 ? "has" : "have"
  return `${nameList} ${verb} been baptized and confirmed ${items.length === 1 ? "a member" : "members"} of The Church of Jesus Christ of Latter-day Saints. Please show by an uplifted hand that you welcome them into the ward.`
}

function recordsReceivedCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  const templateKey = resolveBusinessScriptKey("records_received", items.length)
  const template = scriptTemplates?.[templateKey] ?? defaultConductScriptTemplate(templateKey, language)
  return renderConductScriptTemplate(template, buildBusinessScriptTemplateVariables("records_received", items, language))
}

export function generateCombinedBusinessScript(
  category: BusinessCategoryKey,
  items: BusinessItem[],
  languageOverride?: Language,
  scriptTemplates?: ConductScriptTemplateMap
): string {
  if (items.length === 0) return ""
  if (items.length === 1) return generateBusinessScript(items[0], languageOverride, scriptTemplates)

  switch (category) {
    case "sustaining":
      return sustainingCombined(items, languageOverride, scriptTemplates)
    case "release":
      return releaseCombined(items, languageOverride, scriptTemplates)
    case "ordination":
      return ordinationCombined(items, languageOverride, scriptTemplates)
    case "new_member_welcome":
      return newMemberWelcomeCombined(items, languageOverride, scriptTemplates)
    case "records_received":
      return recordsReceivedCombined(items, languageOverride, scriptTemplates)
    case "confirmation_ordinance":
    case "child_blessing":
    case "miscellaneous":
    default:
      return items.map((item) => generateBusinessScript(item, languageOverride, scriptTemplates)).join("\n\n")
  }
}

export function resolveBusinessMeetingScripts(
  items: BusinessItem[],
  languageOverride?: Language,
  scriptTemplates?: ConductScriptTemplateMap
): ResolvedBusinessMeetingScript[] {
  const buckets = new Map<BusinessCategoryKey, BusinessItem[]>()

  for (const item of items) {
    const key = isBusinessCategoryKey(item.category) ? item.category : "miscellaneous"
    const bucket = buckets.get(key) ?? []
    bucket.push(item)
    buckets.set(key, bucket)
  }

  return BUSINESS_CATEGORY_ORDER.flatMap((category) => {
    const groupedItems = buckets.get(category) ?? []
    if (groupedItems.length === 0) return []

    const language = dominantLanguage(groupedItems, languageOverride)
    const scriptKey = resolveBusinessScriptKey(category, groupedItems.length)
    const template = scriptTemplates?.[scriptKey] ?? defaultConductScriptTemplate(scriptKey, language)
    const renderedScript = generateCombinedBusinessScript(category, groupedItems, language, scriptTemplates).trim()
    const templatePreview = renderConductScriptTemplate(
      template,
      buildBusinessScriptTemplateVariables(category, groupedItems, language)
    ).trim()

    return [
      {
        category,
        scriptKey,
        template,
        templateSnapshot: templatePreview === renderedScript ? template : renderedScript,
        renderedScript,
        businessItemIds: groupedItems.map((item) => item.id).filter(Boolean),
        items: groupedItems,
      },
    ]
  })
}

export function describeOrdination(item: BusinessItem, language: Language = "ENG"): string {
  const office = item.details?.office
  if (!office) return ""
  const priesthood = item.details?.priesthood ?? getPriesthoodFromOffice(office)
  return `${formatOffice(office, language)} · ${formatPriesthood(priesthood, language)} Priesthood`
}
