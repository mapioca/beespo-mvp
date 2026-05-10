import {
  generateBusinessScript,
  formatOffice,
  formatPriesthood,
  getPriesthoodFromOffice,
  type BusinessItem,
  type Language,
} from "@/lib/business-script-generator"
import { renderConductScriptTemplate, type ConductScriptTemplateMap } from "@/lib/conduct-script-templates"

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

export function isBusinessCategoryKey(value: string): value is BusinessCategoryKey {
  return (BUSINESS_CATEGORY_ORDER as string[]).includes(value)
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

function dominantLanguage(items: BusinessItem[], languageOverride?: Language): Language {
  if (languageOverride) return languageOverride
  const spanish = items.filter((i) => i.details?.language === "SPA").length
  return spanish > items.length / 2 ? "SPA" : "ENG"
}

function sustainingCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  const phrases = items.map((i) => {
    const calling = i.position_calling || "[Calling]"
    return language === "SPA"
      ? `${i.person_name} como ${calling}`
      : `${i.person_name} as ${calling}`
  })
  const template = scriptTemplates?.["ward-business.sustaining"]
  if (template) {
    return renderConductScriptTemplate(template, {
      callingPhrases: language === "SPA" ? joinSpanishSeries(phrases) : joinWithSeriesComma(phrases),
      personNames: language === "SPA" ? joinSpanishSeries(items.map((i) => i.person_name)) : joinWithSeriesComma(items.map((i) => i.person_name)),
    })
  }
  if (language === "SPA") {
    return `Hemos llamado a ${joinSpanishSeries(phrases)}, y proponemos que sean sostenidos. Los que estén a favor, sírvanse manifestarlo levantando la mano.\n\n[Pausa para la votación]\n\nLos que se opongan, si los hay, sírvanse manifestarlo.`
  }
  return `We have called ${joinWithSeriesComma(phrases)}, and propose that they be sustained. Those in favor may manifest it by the uplifted hand.\n\n[Pause for voting]\n\nThose opposed, if any, may manifest it.`
}

function releaseCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  const phrases = items.map((i) => {
    const calling = i.position_calling || "[Calling]"
    return language === "SPA"
      ? `${i.person_name} como ${calling}`
      : `${i.person_name} as ${calling}`
  })
  const template = scriptTemplates?.["ward-business.release"]
  if (template) {
    return renderConductScriptTemplate(template, {
      callingPhrases: language === "SPA" ? joinSpanishSeries(phrases) : joinWithSeriesComma(phrases),
      personNames: language === "SPA" ? joinSpanishSeries(items.map((i) => i.person_name)) : joinWithSeriesComma(items.map((i) => i.person_name)),
    })
  }
  if (language === "SPA") {
    return `Hemos relevado a ${joinSpanishSeries(phrases)}, y proponemos que se les dé un voto de agradecimiento por su servicio.`
  }
  return `We have released ${joinWithSeriesComma(phrases)}, and propose a vote of thanks for their service.`
}

function ordinationCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  const phrases = items.map((i) => {
    const office = i.details?.office
    const officeText = office ? formatOffice(office, language) : language === "SPA" ? "[Oficio]" : "[Office]"
    return language === "SPA"
      ? `${i.person_name} al oficio de ${officeText}`
      : `${i.person_name} to the office of ${officeText}`
  })
  const template = scriptTemplates?.["ward-business.ordination"]
  if (template) {
    return renderConductScriptTemplate(template, {
      ordinationPhrases: language === "SPA" ? joinSpanishSeries(phrases) : joinWithSeriesComma(phrases),
      personNames: language === "SPA" ? joinSpanishSeries(items.map((i) => i.person_name)) : joinWithSeriesComma(items.map((i) => i.person_name)),
    })
  }
  if (language === "SPA") {
    return `Se propone que sean ordenados ${joinSpanishSeries(phrases)}. Los que estén a favor, sírvanse manifestarlo levantando la mano.`
  }
  return `We propose that ${joinWithSeriesComma(phrases)} be ordained. Those in favor may manifest it by the uplifted hand.`
}

function newMemberWelcomeCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  const names = items.map((i) => i.person_name)
  const template = scriptTemplates?.["ward-business.new_member_welcome"]
  if (template && items.length === 1) {
    return generateBusinessScript(items[0], languageOverride, scriptTemplates)
  }
  if (language === "SPA") {
    const nameList = joinSpanishSeries(names)
    const verb = items.length === 1 ? "ha sido" : "han sido"
    const baptizedConfirmed = items.length === 1 ? "bautizado y confirmado" : "bautizados y confirmados"
    return `${nameList} ${verb} ${baptizedConfirmed} miembro${items.length === 1 ? "" : "s"} de La Iglesia de Jesucristo de los Santos de los Últimos Días. Les pedimos que muestren con la mano levantada que le${items.length === 1 ? "" : "s"} dan la bienvenida al barrio.`
  }
  const nameList = joinWithSeriesComma(names)
  const verb = items.length === 1 ? "has" : "have"
  return `${nameList} ${verb} been baptized and confirmed ${items.length === 1 ? "a member" : "members"} of The Church of Jesus Christ of Latter-day Saints. Please show by an uplifted hand that you welcome ${items.length === 1 ? names[0] : "them"} into the ward.`
}

function recordsReceivedCombined(items: BusinessItem[], languageOverride?: Language, scriptTemplates?: ConductScriptTemplateMap): string {
  const language = dominantLanguage(items, languageOverride)
  const names = items.map((i) => i.person_name.trim()).filter(Boolean)
  const renderedNames = names.length > 0 ? names.join("\n") : "{{memberNames}}"
  const template = scriptTemplates?.["ward-business.records_received"]
  if (template) {
    return renderConductScriptTemplate(template, {
      memberNames: renderedNames,
      personNames: renderedNames,
    })
  }

  if (language === "SPA") {
    return `Hemos recibido los registros de membresía de las siguientes personas:

${renderedNames}

Al escuchar sus nombres, por favor pónganse de pie.

Quienes puedan darles la bienvenida al barrio, sírvanse manifestarlo levantando la mano.`
  }

  return `We have received the membership records for the following individuals:

${renderedNames}

As your names are read, please stand.

All those who can welcome these members into the ward may manifest it by the uplifted hand.`
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
      return items.map((i) => generateBusinessScript(i, languageOverride, scriptTemplates)).join("\n\n")
  }
}

export function describeOrdination(item: BusinessItem, language: Language = "ENG"): string {
  const office = item.details?.office
  if (!office) return ""
  const priesthood = item.details?.priesthood ?? getPriesthoodFromOffice(office)
  return `${formatOffice(office, language)} · ${formatPriesthood(priesthood, language)} Priesthood`
}
