import { TemplateBuilderPage } from "@/components/templates/builder/template-builder-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Template | Beespo",
  description: "Create a new meeting template",
};

export default function NewTemplatePage() {
  return <TemplateBuilderPage />;
}
