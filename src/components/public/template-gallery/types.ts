import { Database } from "@/types/database";

export type GalleryTemplate = Database["public"]["Tables"]["templates"]["Row"] & {
  items?: Database["public"]["Tables"]["template_items"]["Row"][];
};
