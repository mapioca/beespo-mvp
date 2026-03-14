/**
 * Business Item Conducting Script Generator
 *
 * Generates official conducting scripts following General Handbook standards
 * for various church procedures (sustainings, releases, ordinations, etc.)
 */

// Types for business item details
export type Gender = "male" | "female";

export type PriesthoodOffice =
  | "deacon"
  | "teacher"
  | "priest"
  | "elder"
  | "high_priest";

export type PriesthoodType = "aaronic" | "melchizedek";

export type Language = "ENG" | "SPA";

export interface BusinessItemDetails {
  language?: Language;
  gender?: Gender;
  // For ordinations
  office?: PriesthoodOffice;
  priesthood?: PriesthoodType;
  // For sustainings/releases - stored in position_calling field
  // For confirmations
  ordinance?: string;
  // For other/custom
  customScript?: string;
}

export interface BusinessItem {
  id?: string;
  person_name: string;
  position_calling?: string | null;
  category: string;
  status?: string;
  notes?: string | null;
  details?: BusinessItemDetails | null;
}

// Pronoun helpers
const getSubjectPronoun = (gender?: Gender): string => {
  if (gender === "female") return "she";
  return "he";
};
const getPossessivePronoun = (gender?: Gender): string => {
  if (gender === "female") return "her";
  return "his";
};

// Format priesthood office for display
export const formatOffice = (office?: PriesthoodOffice, language: Language = "ENG"): string => {
  const officeNamesInfo: Record<Language, Record<PriesthoodOffice, string>> = {
    ENG: {
      deacon: "Deacon",
      teacher: "Teacher",
      priest: "Priest",
      elder: "Elder",
      high_priest: "High Priest",
    },
    SPA: {
      deacon: "Diácono",
      teacher: "Maestro",
      priest: "Presbítero",
      elder: "Élder",
      high_priest: "Sumo Sacerdote",
    }
  };
  return office ? officeNamesInfo[language][office] : "";
};

// Format priesthood type for display
export const formatPriesthood = (priesthood?: PriesthoodType, language: Language = "ENG"): string => {
  const priesthoodNamesInfo: Record<Language, Record<PriesthoodType, string>> = {
    ENG: {
      aaronic: "Aaronic",
      melchizedek: "Melchizedek",
    },
    SPA: {
      aaronic: "Aarónico",
      melchizedek: "de Melquisedec",
    }
  };
  return priesthood ? priesthoodNamesInfo[language][priesthood] : "";
};

// Determine priesthood type from office
export const getPriesthoodFromOffice = (office?: PriesthoodOffice): PriesthoodType => {
  if (office === "elder" || office === "high_priest") {
    return "melchizedek";
  }
  return "aaronic";
};

/**
 * Generate the official conducting script for a business item
 * Following General Handbook standards
 */
export function generateBusinessScript(item: BusinessItem): string {
  const { person_name, position_calling, category, details } = item;
  const gender = details?.gender;
  const language = details?.language || "ENG";

  switch (category) {
    case "sustaining":
      return generateSustainingScript(person_name, position_calling, gender, language);

    case "release":
      return generateReleaseScript(person_name, position_calling, gender, language);

    case "ordination":
      return generateOrdinationScript(
        person_name,
        details?.office,
        details?.priesthood,
        language
      );

    case "confirmation":
      return generateConfirmationScript(person_name, gender, language);

    case "setting_apart":
      return generateSettingApartScript(person_name, position_calling, gender, language);

    case "other":
      return details?.customScript || generateOtherScript(person_name, item.notes);

    default:
      return "";
  }
}

/**
 * Sustaining Script
 * "We have called [Name] as [Calling] and propose that [he/she] be sustained..."
 */
function generateSustainingScript(
  name: string,
  calling?: string | null,
  gender?: Gender,
  language: Language = "ENG"
): string {
  const pronoun = getSubjectPronoun(gender);
  const callingText = calling || "[Calling]";

  if (language === "SPA") {
    const sustainedWord = gender === "female" ? "sostenida" : "sostenido";
    return `Hemos llamado a ${name} como ${callingText} y proponemos que sea ${sustainedWord}. Los que estén a favor, sírvanse manifestarlo levantando la mano.

[Pausa para la votación]

Los que se opongan, si los hay, sírvanse manifestarlo.`;
  }

  return `We have called ${name} as ${callingText} and propose that ${pronoun} be sustained. Those in favor may manifest it by the uplifted hand.

[Pause for voting]

Those opposed, if any, may manifest it.`;
}

/**
 * Release Script
 * "We have released [Name] as [Calling] and propose a vote of thanks..."
 */
function generateReleaseScript(
  name: string,
  calling?: string | null,
  gender?: Gender,
  language: Language = "ENG"
): string {
  const possessive = getPossessivePronoun(gender);
  const callingText = calling || "[Calling]";

  if (language === "SPA") {
    const releasedWord = gender === "female" ? "relevada" : "relevado";
    return `${name} ha sido ${releasedWord} como ${callingText}, y proponemos que se le dé un voto de agradecimiento por su servicio. Los que deseen expresar su agradecimiento pueden manifestarlo levantando la mano.`;
  }

  return `${name} has been released as ${callingText} and we propose that ${possessive === "her" ? "she" : "he"} be given a vote of thanks for ${possessive} service. Those who wish to express appreciation may manifest it by the uplifted hand.`;
}

/**
 * Ordination Script (Aaronic and Melchizedek Priesthood)
 * "[Name] has been recommended to be ordained to the office of [Office]..."
 */
function generateOrdinationScript(
  name: string,
  office?: PriesthoodOffice,
  priesthood?: PriesthoodType,
  language: Language = "ENG"
): string {
  const officeText = office ? formatOffice(office, language) : "[Office]";
  const priesthoodText = priesthood ? formatPriesthood(priesthood, language) : "[Priesthood]";

  if (language === "SPA") {
    return `${name} ha sido hallado digno y se recomienda que sea ordenado al oficio de ${officeText} en el Sacerdocio ${priesthoodText}. Proponemos que sea sostenido. Los que estén a favor, sírvanse manifestarlo levantando la mano.

[Pausa para la votación]

Los que se opongan, si los hay, sírvanse manifestarlo.`;
  }

  return `${name} has been found worthy and is recommended to be ordained to the office of ${officeText} in the ${priesthoodText} Priesthood. We propose that he be sustained. Those in favor may manifest it by the uplifted hand.

[Pause for voting]

Those opposed, if any, may manifest it.`;
}

/**
 * Confirmation Script (New Member)
 * "We have received the membership record of [Name]..."
 */
function generateConfirmationScript(
  name: string,
  gender?: Gender,
  language: Language = "ENG"
): string {
  const pronoun = getSubjectPronoun(gender);

  if (language === "SPA") {
    const baptizedConfirmed = gender === "female" ? "bautizada y confirmada" : "bautizado y confirmado";
    const acceptedWord = gender === "female" ? "aceptada" : "aceptado";
    return `Hemos recibido aviso de que ${name} ha sido ${baptizedConfirmed} miembro de La Iglesia de Jesucristo de los Santos de los Últimos Días. Proponemos que sea ${acceptedWord} en plena hermandad en el barrio. Los que estén a favor, sírvanse manifestarlo levantando la mano.

[Pausa para la votación]

Los que se opongan, si los hay, sírvanse manifestarlo.`;
  }

  return `We have received notice that ${name} has been baptized and confirmed a member of The Church of Jesus Christ of Latter-day Saints. We propose that ${pronoun} be accepted into full fellowship in the ward. Those in favor may manifest it by the uplifted hand.

[Pause for voting]

Those opposed, if any, may manifest it.`;
}

/**
 * Setting Apart Script
 * Similar to sustaining but for positions that require setting apart
 */
function generateSettingApartScript(
  name: string,
  calling?: string | null,
  gender?: Gender,
  language: Language = "ENG"
): string {
  const pronoun = getSubjectPronoun(gender);
  const callingText = calling || "[Calling]";

  if (language === "SPA") {
    const sustainedWord = gender === "female" ? "sostenida" : "sostenido";
    const apartWord = gender === "female" ? "apartada" : "apartado";
    return `Hemos llamado a ${name} para servir como ${callingText} y proponemos que sea ${sustainedWord}. Los que estén a favor, sírvanse manifestarlo levantando la mano.

[Pausa para la votación]

Los que se opongan, si los hay, sírvanse manifestarlo.

[Nota: ${name} será ${apartWord} después de la reunión.]`;
  }

  return `We have called ${name} to serve as ${callingText} and propose that ${pronoun} be sustained. Those in favor may manifest it by the uplifted hand.

[Pause for voting]

Those opposed, if any, may manifest it.

[Note: ${name} will be set apart following the meeting.]`;
}

/**
 * Other/Custom Script
 * Uses notes field or custom script from details
 */
function generateOtherScript(
  name: string,
  notes?: string | null
): string {
  if (notes) {
    return `Regarding ${name}:\n\n${notes}`;
  }
  return `[Custom business regarding ${name}]`;
}

/**
 * Get a short description for preview purposes
 */
export function getBusinessScriptSummary(item: BusinessItem): string {
  const { person_name, position_calling, category, details } = item;

  switch (category) {
    case "sustaining":
      return `Sustaining: ${person_name} as ${position_calling || "..."}`;
    case "release":
      return `Release: ${person_name} from ${position_calling || "..."}`;
    case "ordination":
      return `Ordination: ${person_name} to ${formatOffice(details?.office) || "..."} (${formatPriesthood(details?.priesthood) || "..."})`;
    case "confirmation":
      return `Confirmation: ${person_name}`;
    case "setting_apart":
      return `Setting Apart: ${person_name} as ${position_calling || "..."}`;
    case "other":
      return `Other: ${person_name}`;
    default:
      return `${person_name}`;
  }
}

/**
 * Validate that required fields are present for a given category
 */
export function validateBusinessItemDetails(
  category: string,
  positionCalling?: string | null,
  details?: BusinessItemDetails | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (category) {
    case "sustaining":
    case "release":
    case "setting_apart":
      if (!positionCalling?.trim()) {
        errors.push("Position/Calling is required");
      }
      if (!details?.gender) {
        errors.push("Gender is required for correct pronouns");
      }
      break;

    case "ordination":
      if (!details?.office) {
        errors.push("Priesthood office is required");
      }
      // Priesthood type is auto-determined from office, but can be validated
      break;

    case "confirmation":
      if (!details?.gender) {
        errors.push("Gender is required for correct pronouns");
      }
      break;

    case "other":
      // No required fields for "other"
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export priesthood office options for select inputs
export const PRIESTHOOD_OFFICES: { value: PriesthoodOffice; label: string; priesthood: PriesthoodType }[] = [
  { value: "deacon", label: "Deacon", priesthood: "aaronic" },
  { value: "teacher", label: "Teacher", priesthood: "aaronic" },
  { value: "priest", label: "Priest", priesthood: "aaronic" },
  { value: "elder", label: "Elder", priesthood: "melchizedek" },
  { value: "high_priest", label: "High Priest", priesthood: "melchizedek" },
];

// Export category labels
export const BUSINESS_CATEGORIES = {
  sustaining: "Sustaining",
  release: "Release",
  confirmation: "Confirmation",
  ordination: "Ordination",
  setting_apart: "Setting Apart",
  other: "Other",
} as const;
