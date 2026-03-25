"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileUploadZone } from "@/components/file-upload-zone"
import { VOICE_OPTIONS } from "@/lib/voice-options"

const languages = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Japanese",
  "Korean",
  "Chinese (Mandarin)",
]

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [language, setLanguage] = useState("")
  const [voiceId, setVoiceId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFormValid = file && title && author && language && voiceId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid || isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title)
      formData.append("author", author)
      formData.append("language", language)
      formData.append("voiceId", voiceId)

      const response = await fetch("/api/books", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json()) as { error?: string; book?: { id: string } }
      if (!response.ok || !data.book?.id) {
        setError(data.error ?? "Failed to upload manuscript.")
        return
      }

      router.push(`/voices?bookId=${data.book.id}`)
    } catch {
      setError("Unexpected network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Upload Manuscript</h1>
        <p className="text-sm text-muted-foreground">
          Upload your manuscript and we will convert it into a professional audiobook.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="saas-surface border-white/40">
          <CardHeader>
            <CardTitle className="text-base">Manuscript File</CardTitle>
            <CardDescription>
              Upload your manuscript in PDF, DOCX, or TXT format.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFileSelect={setFile} selectedFile={file} />
          </CardContent>
        </Card>

        <Card className="saas-surface border-white/40">
          <CardHeader>
            <CardTitle className="text-base">Book Details</CardTitle>
            <CardDescription>
              Provide information about your audiobook.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Book Title</Label>
              <Input
                id="title"
                placeholder="Enter book title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="author">Author Name</Label>
              <Input
                id="author"
                placeholder="Enter author name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang.toLowerCase()}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="voice">Narrator Voice</Label>
              <Select value={voiceId} onValueChange={setVoiceId}>
                <SelectTrigger id="voice">
                  <SelectValue placeholder="Select narrator voice" />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.accent})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={!isFormValid || isSubmitting} className="w-full sm:w-auto sm:self-end">
          {isSubmitting ? "Uploading..." : "Upload & Process"}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </form>
    </div>
  )
}
