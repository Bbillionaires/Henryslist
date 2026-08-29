import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

export function CategoryIcon({ name, ...props }: { name?: string | null } & Omit<LucideProps, "name">) {
  const icons = Icons as unknown as Record<string, React.ComponentType<LucideProps>>;
  const Icon = (name && icons[name]) || Icons.Tag;
  return <Icon {...props} />;
}
