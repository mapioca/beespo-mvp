import { format } from "date-fns"
import { enUS, es } from "date-fns/locale"
import type { Locale } from "date-fns"

export type ContentLanguage = "ENG" | "SPA"

export function normalizeContentLanguage(value: unknown): ContentLanguage {
  return value === "SPA" ? "SPA" : "ENG"
}

export function dateFnsContentLocale(language: ContentLanguage): Locale {
  return language === "SPA" ? es : enUS
}

export function formatContentDate(
  date: Date,
  language: ContentLanguage,
  formatString: string
) {
  return format(date, localizeContentDateFormat(formatString, language), {
    locale: dateFnsContentLocale(language),
  })
}

export function formatContentUnitName(unitName: string, language: ContentLanguage) {
  const trimmed = unitName.trim()

  if (language === "ENG" || !trimmed) {
    return trimmed
  }

  if (/^barrio\s+/i.test(trimmed)) {
    return trimmed
  }

  const wardMatch = trimmed.match(/^(.*?)\s+ward$/i)

  if (wardMatch?.[1]?.trim()) {
    return `Barrio ${wardMatch[1].trim()}`
  }

  return trimmed
}

function localizeContentDateFormat(formatString: string, language: ContentLanguage) {
  if (language === "ENG") {
    return formatString
  }

  switch (formatString) {
    case "EEEE, MMMM d, yyyy":
      return "EEEE, d 'de' MMMM 'de' yyyy"
    case "MMMM d, yyyy":
      return "d 'de' MMMM 'de' yyyy"
    case "MMM d":
      return "d MMM"
    default:
      return formatString
  }
}

export const MEETING_TYPE_LABELS = {
  ENG: {
    standard: "Sacrament Meeting",
    "fast-testimony": "Fast & Testimony Meeting",
    "general-conference": "General Conference",
    "stake-conference": "Stake Conference",
    "ward-conference": "Ward Conference",
  },
  SPA: {
    standard: "Reunión Sacramental",
    "fast-testimony": "Reunión de Ayuno y Testimonio",
    "general-conference": "Conferencia General",
    "stake-conference": "Conferencia de Estaca",
    "ward-conference": "Conferencia de Barrio",
  },
} as const

export const CONTENT_TEXT = {
  ENG: {
    roles: {
      presiding: "Presiding",
      conductor: "Conducting",
      chorister: "Chorister",
      accompanist: "Organist",
      pianistOrganist: "Piano / Organist",
    },
    audience: {
      greeting: "Greeting & Welcome",
      sacrament: "the sacrament",
      openingHymn: "Opening Hymn",
      sacramentHymn: "Sacrament Hymn",
      closingHymn: "Closing Hymn",
      administration: "Administration of the Sacrament",
      testimonies: "bearing of testimonies",
      testimonyDetail: "The remainder of this meeting will be devoted to the bearing of testimonies",
      speakers: "speakers",
      musicalNumber: "Musical number",
      hymnNo: "Hymn No.",
      concludingSpeaker: "Concluding Speaker",
      speaker: "Speaker",
      speakersTba: "Speakers to be announced",
      closing: "closing",
      invocation: "Invocation",
      benediction: "Benediction",
      announcements: "announcements",
      comingSoonTitle: "Program coming soon",
      comingSoonDescription: "The next meeting program will appear here once it's published.",
      footerQuote: "For where two or three are gathered together in my name, there am I in the midst of them.",
      footerReference: "Matthew 18:20",
    },
    conduct: {
      welcome: "Welcome",
      welcomeAnnouncements: "Welcome & announcements",
      welcomeGreetingMorning: "Good morning",
      welcomeGreetingAfternoon: "Good afternoon",
      welcomeScriptIntro: "brothers and sisters. Welcome to Sacrament Meeting. We welcome those who may be visiting or attending for the first time.",
      presidingScript: "Presiding today is",
      conductingScript: "Conducting is",
      musicScript: "The music will be directed by",
      musicWithAccompanistScript: "with",
      organScript: "at the organ",
      conductedBy: "Conducted by",
      conductingUnassigned: "Conducting: unassigned",
      openingHymnPrayer: "Opening hymn and prayer",
      hymn: "Hymn",
      prayer: "Prayer",
      hymnNotChosen: "Hymn not chosen",
      unassigned: "Unassigned",
      wardBusiness: "Ward Business",
      sustainingsBusiness: "Sustainings & business",
      standPreamble: "Will the following please stand and remain standing?",
      businessItem: "business item",
      businessItems: "business items",
      completedBusinessItems: "Completed business",
      sacrament: "The Sacrament",
      blessingPassing: "Blessing & passing of the sacrament",
      sacramentPreparation: "We will now prepare for the sacrament by singing Sacrament Hymn",
      sacramentAfterHymn: "After which the sacrament will be passed to the congregation.",
      fastMeeting: "Fast Meeting",
      bearingTestimonies: "Bearing of testimonies",
      openToCongregation: "Open to congregation",
      concludingSpeaker: "Concluding Speaker",
      speaker: "Speaker",
      announcements: "Announcements",
      bread: "bread",
      water: "water",
      step: "Step",
      of: "of",
      previous: "Previous",
      next: "Next",
      nextStep: "step",
      meetingNotes: "Meeting notes",
      notesPlaceholder: "Take notes during the meeting - saves automatically.",
      attendanceHelp: "Total in attendance - saved with the meeting.",
    },
    businessPlural: {
      sustaining: "Sustainings",
      release: "Releases",
      confirmation: "Confirmations",
      ordination: "Ordinations",
      other: "Other",
    },
    sacramentPrayers: {
      bread: "Blessing on the Bread",
      water: "Blessing on the Water",
    },
  },
  SPA: {
    roles: {
      presiding: "Preside",
      conductor: "Dirige",
      chorister: "Directora de música",
      accompanist: "Organista",
      pianistOrganist: "Piano / órgano",
    },
    audience: {
      greeting: "Bienvenida",
      sacrament: "la santa cena",
      openingHymn: "Himno de Apertura",
      sacramentHymn: "Himno Sacramental",
      closingHymn: "Himno de Clausura",
      administration: "Administración de la Santa Cena",
      testimonies: "testimonios",
      testimonyDetail: "El resto de esta reunión se dedicará a compartir testimonios",
      speakers: "discursantes",
      musicalNumber: "Número musical",
      hymnNo: "Himno nro.",
      concludingSpeaker: "Último discursante",
      speaker: "Discursante",
      speakersTba: "Discursantes por anunciar",
      closing: "clausura",
      invocation: "Primera Oración",
      benediction: "Última Oración",
      announcements: "anuncios",
      comingSoonTitle: "Programa próximamente",
      comingSoonDescription: "El próximo programa aparecerá aquí cuando sea publicado.",
      footerQuote: "Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos.",
      footerReference: "Mateo 18:20",
    },
    conduct: {
      welcome: "Bienvenida",
      welcomeAnnouncements: "Bienvenida y anuncios",
      welcomeGreetingMorning: "Buenos días",
      welcomeGreetingAfternoon: "Buenas tardes",
      welcomeScriptIntro: "hermanos y hermanas. Bienvenidos a la Reunión Sacramental. Damos la bienvenida a quienes nos visitan o asisten por primera vez.",
      presidingScript: "Preside hoy",
      conductingScript: "Dirige",
      musicScript: "La música será dirigida por",
      musicWithAccompanistScript: "con",
      organScript: "en el órgano",
      conductedBy: "Dirige",
      conductingUnassigned: "Dirige: sin asignar",
      openingHymnPrayer: "Himno y oración de apertura",
      hymn: "Himno",
      prayer: "Oración",
      hymnNotChosen: "Himno no seleccionado",
      unassigned: "Sin asignar",
      wardBusiness: "Asuntos del Barrio",
      sustainingsBusiness: "Sostenimientos y asuntos",
      standPreamble: "¿Podrían las siguientes personas ponerse de pie y permanecer de pie?",
      businessItem: "asunto",
      businessItems: "asuntos",
      completedBusinessItems: "Asuntos completados",
      sacrament: "La Santa Cena",
      blessingPassing: "Bendición y repartición de la santa cena",
      sacramentPreparation: "Ahora nos prepararemos para la Santa Cena cantando el Himno Sacramental",
      sacramentAfterHymn: "Después, se repartirá la Santa Cena a la congregación.",
      fastMeeting: "Reunión de Ayuno",
      bearingTestimonies: "Testimonios",
      openToCongregation: "Abierto a la congregación",
      concludingSpeaker: "Último discursante",
      speaker: "Discursante",
      announcements: "Anuncios",
      bread: "pan",
      water: "agua",
      step: "Paso",
      of: "de",
      previous: "Anterior",
      next: "Siguiente",
      nextStep: "paso",
      meetingNotes: "Notas de la reunión",
      notesPlaceholder: "Toma notas durante la reunión - se guardan automáticamente.",
      attendanceHelp: "Total de asistencia - se guarda con la reunión.",
    },
    businessPlural: {
      sustaining: "Sostenimientos",
      release: "Relevos",
      confirmation: "Confirmaciones",
      ordination: "Ordenaciones",
      other: "Otros",
    },
    sacramentPrayers: {
      bread: "Bendición del Pan",
      water: "Bendición del Agua",
    },
  },
} as const

export function getContentText(language: ContentLanguage) {
  return CONTENT_TEXT[language]
}
