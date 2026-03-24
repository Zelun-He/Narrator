import { BookOpen, Clock, CheckCircle2, AudioLines } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { BookListItem } from "@/lib/audiobook-types"

interface StatsCardsProps {
  books?: BookListItem[]
}

export function StatsCards({ books = [] }: StatsCardsProps) {
  const total = books.length
  const inProgress = books.filter((book) => book.status === "processing").length
  const completed = books.filter((book) => book.status === "completed").length
  const estimatedHours = books
    .filter((book) => book.status === "completed")
    .reduce((acc, book) => acc + book.chapters * 11, 0) / 60

  const stats = [
    {
      label: "Total Books",
      value: String(total),
      change: total > 0 ? "Saved in your library" : "No uploads yet",
      icon: BookOpen,
      color: "#FF6B6B",
    },
    {
      label: "In Progress",
      value: String(inProgress),
      change: "Active processing",
      icon: Clock,
      color: "#F59E0B",
    },
    {
      label: "Completed",
      value: String(completed),
      change: "Ready to play",
      icon: CheckCircle2,
      color: "#4ECDC4",
    },
    {
      label: "Total Hours",
      value: estimatedHours.toFixed(1),
      change: "Estimated generated audio",
      icon: AudioLines,
      color: "#A78BFA",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="saas-surface border-white/40 py-4">
          <CardContent className="flex items-center gap-4">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: stat.color + "1A" }}
            >
              <stat.icon className="size-5" style={{ color: stat.color }} />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tracking-tight">{stat.value}</span>
              <span className="text-xs font-medium text-foreground">{stat.label}</span>
              <span className="text-xs text-muted-foreground">{stat.change}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
