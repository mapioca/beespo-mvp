import { Database } from "@/types/database";

export type LibraryTemplate = Database["public"]["Tables"]["templates"]["Row"] & {
  items?: Database["public"]["Tables"]["template_items"]["Row"][];
  author?: { full_name: string | null } | null;
};
