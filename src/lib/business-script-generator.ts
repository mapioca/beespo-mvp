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
  // For baptism/confirmation recognition
  baptismDate?: string;
  confirmationDate?: string;
  // For child blessings
  childName?: string;
  voiceName?: string;
  // For records received
  memberNames?: string[];
  // For miscellaneous/custom
  customScript?: string;
  customText?: string;
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
const getObjectPronoun = (gender?: Gender): string => {
  if (gender === "female") return "her";
  return "him";
};

const tokenOrValue = (value: string | null | undefined, token: string): string => {
  const trimmed = value?.trim();
  return trimmed || `{{${token}}}`;
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
export function generateBusinessScript(
  item: BusinessItem,
  languageOverride?: Language,
  scriptTemplates?: ConductScriptTemplateMap
): string {
  const { person_name, position_calling, category, details } = item;
  const gender = details?.gender;
  const language = languageOverride || details?.language || "ENG";

  switch (category) {
    case "sustaining":
      return generateSustainingScript(person_name, position_calling, gender, language, scriptTemplates);

    case "release":
      return generateReleaseScript(person_name, position_calling, gender, language, scriptTemplates);

    case "ordination":
      return generateOrdinationScript(
        person_name,
        details?.office,
        details?.priesthood,
        language,
        scriptTemplates
      );

    case "confirmation_ordinance":
      return generateConfirmationOrdinanceScript(person_name, details?.baptismDate, language, scriptTemplates);

    case "new_member_welcome":
      return generateNewMemberWelcomeScript(
        person_name,
        details?.confirmationDate,
        gender,
        language,
        scriptTemplates
      );

    case "child_blessing":
      return generateChildBlessingScript(
        details?.childName || person_name,
        details?.voiceName,
        language,
        scriptTemplates
      );

    case "records_received":
      return generateRecordsReceivedScript(details?.memberNames?.length ? details.memberNames : [person_name], language, scriptTemplates);

    case "miscellaneous":
      return renderConductScriptTemplate(
        scriptTemplates?.["ward-business.miscellaneous"] ?? defaultConductScriptTemplate("ward-business.miscellaneous", language),
        { customText: details?.customText || details?.customScript || item.notes }
      );

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
  language: Language = "ENG",
  scriptTemplates?: ConductScriptTemplateMap
): string {
  const pronoun = getSubjectPronoun(gender);
  const callingText = calling || "[Calling]";
  const template = scriptTemplates?.["ward-business.sustaining"];
  if (template) {
    return renderConductScriptTemplate(template, {
      personName: name,
      calling: callingText,
      callingPhrases: language === "SPA" ? `${name} como ${callingText}` : `${name} as ${callingText}`,
      subjectPronoun: pronoun,
    });
  }

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
  language: Language = "ENG",
  scriptTemplates?: ConductScriptTemplateMap
): string {
  const possessive = getPossessivePronoun(gender);
  const callingText = calling || "[Calling]";
  const template = scriptTemplates?.["ward-business.release"];
  if (template) {
    return renderConductScriptTemplate(template, {
      personName: name,
      calling: callingText,
      callingPhrases: language === "SPA" ? `${name} como ${callingText}` : `${name} as ${callingText}`,
      possessivePronoun: possessive,
    });
  }

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
  language: Language = "ENG",
  scriptTemplates?: ConductScriptTemplateMap
): string {
  const officeText = office ? formatOffice(office, language) : "[Office]";
  const priesthoodText = priesthood ? formatPriesthood(priesthood, language) : "[Priesthood]";
  const template = scriptTemplates?.["ward-business.ordination"];
  if (template) {
    return renderConductScriptTemplate(template, {
      personName: name,
      office: officeText,
      priesthood: priesthoodText,
      ordinationPhrases: language === "SPA" ? `${name} al oficio de ${officeText}` : `${name} to the office of ${officeText}`,
    });
  }

  if (language === "SPA") {
    return `${name} ha sido hallado digno y se recomienda que sea ordenado al oficio de ${officeText} en el Sacerdocio ${priesthoodText}. Proponemos que sea sostenido. Los que estén a favor, sírvanse manifestarlo levantando la mano.

[Pausa para la votación]

Los que se opongan, si los hay, sírvanse manifestarlo.`;
  }

  return `${name} has been found worthy and is recommended to be ordained to the office of ${officeText} in the ${priesthoodText} Priesthood. We propose that he be sustained. Those in favor may manifest it by the uplifted hand.

[Pause for voting]

Those opposed, if any, may manifest it.`;
}

function generateNewMemberWelcomeScript(
  name: string,
  confirmationDate?: string,
  gender?: Gender,
  language: Language = "ENG",
  scriptTemplates?: ConductScriptTemplateMap
): string {
  const personName = tokenOrValue(name, "personName");
  const date = tokenOrValue(confirmationDate, "confirmationDate");
  const objectPronoun = getObjectPronoun(gender);
  const template = scriptTemplates?.["ward-business.new_member_welcome"];
  if (template) {
    return renderConductScriptTemplate(template, {
      personName,
      confirmationDate: date,
      objectPronoun,
    });
  }

  if (language === "SPA") {
    const baptizedConfirmed = gender === "female" ? "bautizada y confirmada" : "bautizado y confirmado";
    return `${personName} fue ${baptizedConfirmed} miembro de La Iglesia de Jesucristo de los Santos de los Últimos Días el ${date}.

Nos complace darle la bienvenida al barrio. Quienes puedan dar la bienvenida a ${personName}, sírvanse manifestarlo levantando la mano.`;
  }

  return `${personName} was baptized and confirmed a member of The Church of Jesus Christ of Latter-day Saints on ${date}.

We are grateful to welcome ${objectPronoun} into the ward. All those who can welcome ${personName} may manifest it by the uplifted hand.`;
}

function generateConfirmationOrdinanceScript(
  name: string,
  baptismDate?: string,
  language: Language = "ENG",
  scriptTemplates?: ConductScriptTemplateMap
): string {
  const personName = tokenOrValue(name, "personName");
  const date = tokenOrValue(baptismDate, "baptismDate");
  const template = scriptTemplates?.["ward-business.confirmation_ordinance"];
  if (template) {
    return renderConductScriptTemplate(template, {
      personName,
      baptismDate: date,
    });
  }

  if (language === "SPA") {
    return `${personName} fue bautizado el ${date} y ahora será confirmado miembro de La Iglesia de Jesucristo de los Santos de los Últimos Días.

Quienes hayan sido invitados a participar, por favor pasen al frente.

[Después de la confirmación]

Quienes puedan dar la bienvenida a ${personName} al barrio, sírvanse manifestarlo levantando la mano.`;
  }

  return `${personName} was baptized on ${date} and will now be confirmed a member of The Church of Jesus Christ of Latter-day Saints.

Those who have been invited to participate, please come forward.

[After the confirmation]

All those who can welcome ${personName} into the ward may manifest it by the uplifted hand.`;
}

function generateChildBlessingScript(
  childName: string,
  voiceName?: string,
  language: Language = "ENG",
  scriptTemplates?: ConductScriptTemplateMap
): string {
  const child = tokenOrValue(childName, "childName");
  const voice = tokenOrValue(voiceName, "voiceName");
  const template = scriptTemplates?.["ward-business.child_blessing"];
  if (template) {
    return renderConductScriptTemplate(template, {
      childName: child,
      voiceName: voice,
    });
  }

  if (language === "SPA") {
    return `${child} recibirá ahora un nombre y una bendición. ${voice} actuará como voz.

Quienes hayan sido invitados a participar, por favor pasen al frente.`;
  }

  return `${child} will now receive a name and a blessing. ${voice} will act as voice.

Those who have been invited to participate, please come forward.`;
}

function generateRecordsReceivedScript(
  names: string[],
  language: Language = "ENG",
  scriptTemplates?: ConductScriptTemplateMap
): string {
  const memberNames = names.map((name) => name.trim()).filter(Boolean);
  const renderedNames = memberNames.length > 0 ? memberNames.join("\n") : "{{memberNames}}";
  const template = scriptTemplates?.["ward-business.records_received"];
  if (template) {
    return renderConductScriptTemplate(template, {
      memberNames: renderedNames,
      personNames: renderedNames,
    });
  }

  if (language === "SPA") {
    return `Hemos recibido los registros de membresía de las siguientes personas:

${renderedNames}

Al escuchar sus nombres, por favor pónganse de pie.

Quienes puedan darles la bienvenida al barrio, sírvanse manifestarlo levantando la mano.`;
  }

  return `We have received the membership records for the following individuals:

${renderedNames}

As your names are read, please stand.

All those who can welcome these members into the ward may manifest it by the uplifted hand.`;
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
    case "confirmation_ordinance":
      return `Confirmation: ${person_name}`;
    case "new_member_welcome":
      return `New Member Welcome: ${person_name}`;
    case "child_blessing":
      return `Child Blessing: ${details?.childName || person_name}`;
    case "records_received":
      return `Records Received: ${person_name}`;
    case "miscellaneous":
      return `Miscellaneous: ${person_name}`;
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

    case "confirmation_ordinance":
    case "new_member_welcome":
      if (!details?.gender) {
        errors.push("Gender is required for correct pronouns");
      }
      break;

    case "child_blessing":
      if (!(details?.childName?.trim() || details?.voiceName?.trim())) {
        // The selected person can still be used as the child name.
        break;
      }
      break;

    case "records_received":
    case "miscellaneous":
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
  ordination: "Ordination",
  confirmation_ordinance: "Confirmation",
  new_member_welcome: "New Member Welcome",
  child_blessing: "Child Blessing",
  records_received: "Records Received",
  miscellaneous: "Miscellaneous",
} as const;
import {
  defaultConductScriptTemplate,
  renderConductScriptTemplate,
  type ConductScriptTemplateMap,
} from "@/lib/conduct-script-templates";
