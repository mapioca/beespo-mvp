import type { BusinessItem } from "@/components/business/business-table";
import { BUSINESS_CATEGORY_LABEL } from "./combined-script";

export interface ScriptVariable {
  key: string;
  label: string;
  value: string;
}

/**
 * Convert a generated script to template format with variables
 */
export function scriptToTemplate(
  script: string,
  items: BusinessItem[]
): { template: string; variables: ScriptVariable[] } {
  let template = script;
  const variables: ScriptVariable[] = [];

  items.forEach((item, index) => {
    const num = index + 1;
    const category = BUSINESS_CATEGORY_LABEL[item.category as keyof typeof BUSINESS_CATEGORY_LABEL] || item.category;
    
    // Replace person name
    if (item.person_name) {
      const nameVar = `{{person_name_${num}}}`;
      const nameLabel = `${item.person_name} (${category})`;
      template = template.replace(new RegExp(item.person_name, 'g'), nameVar);
      variables.push({
        key: nameVar,
        label: nameLabel,
        value: item.person_name,
      });
    }

    // Replace calling/position
    if (item.position_calling) {
      const callingVar = `{{calling_${num}}}`;
      const callingLabel = `${item.position_calling}`;
      template = template.replace(new RegExp(item.position_calling, 'g'), callingVar);
      variables.push({
        key: callingVar,
        label: callingLabel,
        value: item.position_calling,
      });
    }

    // Replace priesthood office for ordinations
    if (item.category === 'ordination' && item.details?.office) {
      const officeVar = `{{office_${num}}}`;
      const officeLabel = item.details.office;
      template = template.replace(new RegExp(item.details.office, 'gi'), officeVar);
      variables.push({
        key: officeVar,
        label: officeLabel,
        value: item.details.office,
      });
    }
  });

  return { template, variables };
}

/**
 * Convert a template with variables back to a rendered script
 */
export function templateToScript(
  template: string,
  variables: ScriptVariable[]
): string {
  let script = template;
  
  variables.forEach((variable) => {
    script = script.replace(new RegExp(variable.key, 'g'), variable.value);
  });

  return script;
}
