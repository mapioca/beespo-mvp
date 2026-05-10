import type { BusinessCategoryKey } from "@/lib/business/combined-script"
import type { ContentLanguage } from "@/lib/content-language"

export type ConductScriptKey =
  | "welcome"
  | "sacrament-preparation"
  | `ward-business.${BusinessCategoryKey}`

export type ConductScriptTemplateMap = Partial<Record<ConductScriptKey, string>>

export type ConductScriptVariable = {
  key: string
  label: string
  description: string
}

export const CONDUCT_SCRIPT_KEYS: Array<{
  key: ConductScriptKey
  label: string
  group: "Meeting" | "Ward Business"
  description: string
}> = [
  {
    key: "welcome",
    label: "Welcome",
    group: "Meeting",
    description: "Opening welcome and presiding/conducting acknowledgments.",
  },
  {
    key: "sacrament-preparation",
    label: "Sacrament Preparation",
    group: "Meeting",
    description: "Transition into the sacrament hymn and administration.",
  },
  {
    key: "ward-business.sustaining",
    label: "Sustaining",
    group: "Ward Business",
    description: "Presenting members to be sustained.",
  },
  {
    key: "ward-business.release",
    label: "Release",
    group: "Ward Business",
    description: "Presenting releases and a vote of thanks.",
  },
  {
    key: "ward-business.ordination",
    label: "Ordination",
    group: "Ward Business",
    description: "Presenting priesthood ordinations.",
  },
  {
    key: "ward-business.confirmation_ordinance",
    label: "Confirmation",
    group: "Ward Business",
    description: "Transition into a confirmation during sacrament meeting.",
  },
  {
    key: "ward-business.new_member_welcome",
    label: "New Member Welcome",
    group: "Ward Business",
    description: "Welcoming a member whose baptism and confirmation already happened.",
  },
  {
    key: "ward-business.child_blessing",
    label: "Child Blessing",
    group: "Ward Business",
    description: "Transition into naming and blessing a child.",
  },
  {
    key: "ward-business.records_received",
    label: "Records Received",
    group: "Ward Business",
    description: "Welcoming members whose records were received.",
  },
  {
    key: "ward-business.miscellaneous",
    label: "Miscellaneous",
    group: "Ward Business",
    description: "Open text for other recognized business.",
  },
]

export const CONDUCT_SCRIPT_VARIABLES: ConductScriptVariable[] = [
  { key: "greeting", label: "Greeting", description: "Good morning or good afternoon." },
  { key: "unitName", label: "Unit name", description: "Ward or branch name." },
  { key: "presiding", label: "Presiding", description: "Presiding leader." },
  { key: "conductor", label: "Conductor", description: "Person conducting." },
  { key: "chorister", label: "Chorister", description: "Music leader." },
  { key: "accompanist", label: "Accompanist", description: "Accompanist or organist." },
  { key: "sacramentHymnNumber", label: "Sacrament hymn number", description: "Selected sacrament hymn number." },
  { key: "sacramentHymnTitle", label: "Sacrament hymn title", description: "Selected sacrament hymn title." },
  { key: "personName", label: "Person name", description: "Primary business item person." },
  { key: "personNames", label: "Person names", description: "Business item names joined in a sentence." },
  { key: "memberNames", label: "Member names", description: "Records received names, one per line." },
  { key: "calling", label: "Calling", description: "Calling or position." },
  { key: "callingPhrases", label: "Calling phrases", description: "Names with callings for grouped sustainings/releases." },
  { key: "office", label: "Priesthood office", description: "Priesthood office for ordinations." },
  { key: "ordinationPhrases", label: "Ordination phrases", description: "Names with priesthood offices." },
  { key: "baptismDate", label: "Baptism date", description: "Baptism date for a confirmation." },
  { key: "confirmationDate", label: "Confirmation date", description: "Date the baptism and confirmation were completed." },
  { key: "childName", label: "Child name", description: "Child receiving a name and blessing." },
  { key: "voiceName", label: "Voice", description: "Person acting as voice for a child blessing." },
  { key: "subjectPronoun", label: "Subject pronoun", description: "He or she." },
  { key: "objectPronoun", label: "Object pronoun", description: "Him or her." },
  { key: "possessivePronoun", label: "Possessive pronoun", description: "His or her." },
  { key: "customText", label: "Custom text", description: "Open text for miscellaneous business." },
]

export const DEFAULT_CONDUCT_SCRIPT_TEMPLATES: Record<ContentLanguage, Record<ConductScriptKey, string>> = {
  ENG: {
    welcome: "{{greeting}}, brothers and sisters. Welcome to sacrament meeting.\n\nPresiding today is {{presiding}}. Conducting is {{conductor}}.\n\nThe music will be directed by {{chorister}}, with {{accompanist}} at the organ.",
    "sacrament-preparation": "We will now prepare for the sacrament by singing hymn #{{sacramentHymnNumber}}, {{sacramentHymnTitle}}. After the hymn, the sacrament will be administered.",
    "ward-business.sustaining": "We have called {{callingPhrases}}, and propose that they be sustained. Those in favor may manifest it by the uplifted hand.\n\n[Pause for voting]\n\nThose opposed, if any, may manifest it.",
    "ward-business.release": "We have released {{callingPhrases}}, and propose a vote of thanks for their service.",
    "ward-business.ordination": "We propose that {{ordinationPhrases}} be ordained. Those in favor may manifest it by the uplifted hand.",
    "ward-business.confirmation_ordinance": "{{personName}} was baptized on {{baptismDate}} and will now be confirmed a member of The Church of Jesus Christ of Latter-day Saints.\n\nThose who have been invited to participate, please come forward.\n\n[After the confirmation]\n\nAll those who can welcome {{personName}} into the ward may manifest it by the uplifted hand.",
    "ward-business.new_member_welcome": "{{personName}} was baptized and confirmed a member of The Church of Jesus Christ of Latter-day Saints on {{confirmationDate}}.\n\nWe are grateful to welcome {{objectPronoun}} into the ward. All those who can welcome {{personName}} may manifest it by the uplifted hand.",
    "ward-business.child_blessing": "{{childName}} will now receive a name and a blessing. {{voiceName}} will act as voice.\n\nThose who have been invited to participate, please come forward.",
    "ward-business.records_received": "We have received the membership records for the following individuals:\n\n{{memberNames}}\n\nAs your names are read, please stand.\n\nAll those who can welcome these members into the ward may manifest it by the uplifted hand.",
    "ward-business.miscellaneous": "{{customText}}",
  },
  SPA: {
    welcome: "{{greeting}}, hermanos y hermanas. Bienvenidos a la reunión sacramental.\n\nPreside hoy {{presiding}}. Dirige {{conductor}}.\n\nLa música estará a cargo de {{chorister}}, con {{accompanist}} al órgano.",
    "sacrament-preparation": "Ahora nos prepararemos para la Santa Cena cantando el himno #{{sacramentHymnNumber}}, {{sacramentHymnTitle}}. Después del himno, se administrará la Santa Cena.",
    "ward-business.sustaining": "Hemos llamado a {{callingPhrases}}, y proponemos que sean sostenidos. Los que estén a favor, sírvanse manifestarlo levantando la mano.\n\n[Pausa para la votación]\n\nLos que se opongan, si los hay, sírvanse manifestarlo.",
    "ward-business.release": "Hemos relevado a {{callingPhrases}}, y proponemos que se les dé un voto de agradecimiento por su servicio.",
    "ward-business.ordination": "Se propone que sean ordenados {{ordinationPhrases}}. Los que estén a favor, sírvanse manifestarlo levantando la mano.",
    "ward-business.confirmation_ordinance": "{{personName}} fue bautizado el {{baptismDate}} y ahora será confirmado miembro de La Iglesia de Jesucristo de los Santos de los Últimos Días.\n\nQuienes hayan sido invitados a participar, por favor pasen al frente.\n\n[Después de la confirmación]\n\nQuienes puedan dar la bienvenida a {{personName}} al barrio, sírvanse manifestarlo levantando la mano.",
    "ward-business.new_member_welcome": "{{personName}} fue bautizado y confirmado miembro de La Iglesia de Jesucristo de los Santos de los Últimos Días el {{confirmationDate}}.\n\nNos complace darle la bienvenida al barrio. Quienes puedan dar la bienvenida a {{personName}}, sírvanse manifestarlo levantando la mano.",
    "ward-business.child_blessing": "{{childName}} recibirá ahora un nombre y una bendición. {{voiceName}} actuará como voz.\n\nQuienes hayan sido invitados a participar, por favor pasen al frente.",
    "ward-business.records_received": "Hemos recibido los registros de membresía de las siguientes personas:\n\n{{memberNames}}\n\nAl escuchar sus nombres, por favor pónganse de pie.\n\nQuienes puedan darles la bienvenida al barrio, sírvanse manifestarlo levantando la mano.",
    "ward-business.miscellaneous": "{{customText}}",
  },
}

export function defaultConductScriptTemplate(key: ConductScriptKey, language: ContentLanguage): string {
  return DEFAULT_CONDUCT_SCRIPT_TEMPLATES[language][key]
}

export function renderConductScriptTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key: string) => {
    const value = variables[key]
    if (value === null || value === undefined || String(value).trim() === "") {
      return match
    }
    return String(value)
  })
}
