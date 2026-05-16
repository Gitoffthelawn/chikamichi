import type { LucideIcon } from "lucide-react";
import type { getSearchItems } from "~/popup/utils/getSearchItems";

export type SearchCollections = Awaited<ReturnType<typeof getSearchItems>>;

export type ActionItem = {
  description: string;
  icon: LucideIcon;
  id: string;
  keywords: string;
  run: () => Promise<void>;
  title: string;
};
