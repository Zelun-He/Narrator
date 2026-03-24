"use client"

import { useCallback, useState } from "react"
import { Upload, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FileUploadZoneProps {
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
}

export function FileUploadZone({ onFileSelect, selectedFile }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function isAcceptedFile(file: File): boolean {
    const lowerName = file.name.toLowerCase()
    return lowerName.endsWith(".pdf") || lowerName.endsWith(".docx") || lowerName.endsWith(".txt")
  }

  function applyFile(file: File | undefined) {
    if (!file) return
    if (!isAcceptedFile(file)) {
      setError("Unsupported file type. Please upload PDF, DOCX, or TXT.")
      return
    }
    setError(null)
    onFileSelect(file)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      applyFile(e.dataTransfer.files[0])
    },
    [onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      applyFile(e.target.files?.[0])
    },
    [onFileSelect]
  )

  if (selectedFile) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#0EA5E9]/15">
            <FileText className="size-5 text-[#0EA5E9]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setError(null)
            onFileSelect(null)
          }}
        >
          <X className="size-4" />
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="file-upload"
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 transition-colors",
          isDragOver
            ? "border-[#0EA5E9] bg-[#0EA5E9]/5"
            : "border-border hover:border-[#0EA5E9]/50 hover:bg-muted/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-[#0EA5E9]/15">
          <Upload className="size-6 text-[#0EA5E9]" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium">
            Drag and drop your manuscript here
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse. Supports PDF, DOCX, TXT
          </p>
        </div>
        <input
          id="file-upload"
          type="file"
          accept=".pdf,.docx,.txt"
          className="sr-only"
          onChange={handleFileInput}
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
