import {
  generateBusinessScript,
  formatOffice,
  formatPriesthood,
  getPriesthoodFromOffice,
  type BusinessItem,
  type Language,
} from "@/lib/business-script-generator"

export type BusinessCategoryKey =
  | "sustaining"
  | "release"
  | "confirmation"
  | "ordination"
  | "other"

export const BUSINESS_CATEGORY_ORDER: BusinessCategoryKey[] = [
  "sustaining",
  "release",
  "ordination",
  "confirmation",
  "other",
]

export const BUSINESS_CATEGORY_LABEL: Record<BusinessCategoryKey, string> = {
  sustaining: "Sustaining",
  release: "Release",
  confirmation: "Confirmation",
  ordination: "Ordination",
  other: "Other",
}

export const BUSINESS_CATEGORY_PLURAL: Record<BusinessCategoryKey, string> = {
  sustaining: "Sustainings",
  release: "Releases",
  confirmation: "Confirmations",
  ordination: "Ordinations",
  other: "Other",
}

export const BUSINESS_CATEGORY_GLYPH: Record<BusinessCategoryKey, string> = {
  sustaining: "+",
  release: "−",
  confirmation: "+",
  ordination: "○",
  other: "·",
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

function dominantLanguage(items: BusinessItem[]): Language {
  const spanish = items.filter((i) => i.details?.language === "SPA").length
  return spanish > items.length / 2 ? "SPA" : "ENG"
}

function sustainingCombined(items: BusinessItem[]): string {
  const language = dominantLanguage(items)
  const phrases = items.map((i) => {
    const calling = i.position_calling || "[Calling]"
    return language === "SPA"
      ? `${i.person_name} como ${calling}`
      : `${i.person_name} as ${calling}`
  })
  if (language === "SPA") {
    return `Hemos llamado a ${joinSpanishSeries(phrases)}, y proponemos que sean sostenidos. Los que estén a favor, sírvanse manifestarlo levantando la mano.\n\n[Pausa para la votación]\n\nLos que se opongan, si los hay, sírvanse manifestarlo.`
  }
  return `We have called ${joinWithSeriesComma(phrases)}, and propose that they be sustained. Those in favor may manifest it by the uplifted hand.\n\n[Pause for voting]\n\nThose opposed, if any, may manifest it.`
}

function releaseCombined(items: BusinessItem[]): string {
  const language = dominantLanguage(items)
  const phrases = items.map((i) => {
    const calling = i.position_calling || "[Calling]"
    return language === "SPA"
      ? `${i.person_name} como ${calling}`
      : `${i.person_name} as ${calling}`
  })
  if (language === "SPA") {
    return `Hemos relevado a ${joinSpanishSeries(phrases)}, y proponemos que se les dé un voto de agradecimiento por su servicio.`
  }
  return `We have released ${joinWithSeriesComma(phrases)}, and propose a vote of thanks for their service.`
}

function ordinationCombined(items: BusinessItem[]): string {
  const language = dominantLanguage(items)
  const phrases = items.map((i) => {
    const office = i.details?.office
    const officeText = office ? formatOffice(office, language) : language === "SPA" ? "[Oficio]" : "[Office]"
    return language === "SPA"
      ? `${i.person_name} al oficio de ${officeText}`
      : `${i.person_name} to the office of ${officeText}`
  })
  if (language === "SPA") {
    return `Se propone que sean ordenados ${joinSpanishSeries(phrases)}. Los que estén a favor, sírvanse manifestarlo levantando la mano.`
  }
  return `We propose that ${joinWithSeriesComma(phrases)} be ordained. Those in favor may manifest it by the uplifted hand.`
}

function confirmationCombined(items: BusinessItem[]): string {
  const language = dominantLanguage(items)
  const names = items.map((i) => i.person_name)
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

export function generateCombinedBusinessScript(
  category: BusinessCategoryKey,
  items: BusinessItem[]
): string {
  if (items.length === 0) return ""
  if (items.length === 1) return generateBusinessScript(items[0])

  switch (category) {
    case "sustaining":
      return sustainingCombined(items)
    case "release":
      return releaseCombined(items)
    case "ordination":
      return ordinationCombined(items)
    case "confirmation":
      return confirmationCombined(items)
    case "other":
    default:
      return items.map((i) => generateBusinessScript(i)).join("\n\n")
  }
}

export function describeOrdination(item: BusinessItem, language: Language = "ENG"): string {
  const office = item.details?.office
  if (!office) return ""
  const priesthood = item.details?.priesthood ?? getPriesthoodFromOffice(office)
  return `${formatOffice(office, language)} · ${formatPriesthood(priesthood, language)} Priesthood`
}
