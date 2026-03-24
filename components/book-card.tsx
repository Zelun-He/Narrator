"use client"

import { BookOpen, MoreHorizontal, Play } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import type { BookStatus } from "@/lib/audiobook-types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BookCardProps {
  id: string
  title: string
  author: string
  status: BookStatus
  chapters: number
  progress: number
  coverColor: string
}

function getStatusBadge(status: BookStatus) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-[#4ECDC4]/15 text-[#4ECDC4] border-transparent">
          Completed
        </Badge>
      )
    case "processing":
      return (
        <Badge className="bg-[#F59E0B]/15 text-[#D97706] dark:text-[#FBBF24] border-transparent">
          Processing
        </Badge>
      )
    case "failed":
      return (
        <Badge className="bg-[#FF6B6B]/15 text-[#FF6B6B] border-transparent">
          Failed
        </Badge>
      )
  }
}

export function BookCard({ id, title, author, status, chapters, progress, coverColor }: BookCardProps) {
  return (
    <Card className="saas-surface group relative overflow-hidden border-white/40 transition-all hover:-translate-y-0.5">
      <div
        className="pointer-events-none absolute -bottom-12 left-6 right-6 h-20 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-45"
        style={{ backgroundColor: coverColor }}
      />
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
        style={{ backgroundColor: coverColor }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: coverColor + "1A" }}
            >
              <BookOpen className="size-5" style={{ color: coverColor }} />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-sm">{title}</CardTitle>
              <p className="text-xs text-muted-foreground">{author}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Download</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          {getStatusBadge(status)}
          <span className="text-xs text-muted-foreground">{chapters} chapters</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        {status === "completed" && (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/player?bookId=${id}`}>
              <Play className="size-3.5" />
              Play Audiobook
            </Link>
          </Button>
        )}
        {status === "processing" && (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/processing?bookId=${id}`}>
              View Progress
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
