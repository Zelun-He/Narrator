import { Library, CheckCircle2, AudioLines } from "lucide-react";
import type { BookListItem } from "@/lib/audiobook-types";
export function StatsCards({ books = [] }: { books?: BookListItem[] }) {
  const stats = [
    { label: "Books in your library", value: books.length, icon: Library },
    {
      label: "Finished projects",
      value: books.filter((b) => b.status === "completed").length,
      icon: CheckCircle2,
    },
    {
      label: "Being narrated",
      value: books.filter((b) => b.status === "processing").length,
      icon: AudioLines,
    },
  ];
  return (
    <div className="studio-stats">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-4">
          <s.icon size={19} className="text-primary" />
          <span className="text-2xl font-medium tabular-nums">{s.value}</span>
          <span className="text-xs text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
