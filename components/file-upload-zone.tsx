"use client";
import { useId, useState } from "react";
import { Upload, FileText, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export function FileUploadZone({
  onFileSelect,
  selectedFile,
}: {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function apply(file: File | undefined) {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      setError("Choose a PDF, DOCX, or TXT manuscript.");
      return;
    }
    if (!file.size) {
      setError("This file is empty. Please choose a manuscript with text.");
      return;
    }
    setError(null);
    onFileSelect(file);
  }
  return (
    <div>
      {selectedFile ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-5">
          <FileText className="size-7 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="break-all text-sm font-medium">{selectedFile.name}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Check size={12} />
              Ready to upload · {(selectedFile.size / 1024 / 1024).toFixed(
                2,
              )}{" "}
              MB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setError(null);
              onFileSelect(null);
            }}
            aria-label="Remove manuscript"
          >
            <X size={16} />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn("dropzone", dragging && "dragging")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            apply(e.dataTransfer.files[0]);
          }}
        >
          <span className="flex size-12 items-center justify-center rounded-xl border bg-card text-primary">
            <Upload size={23} />
          </span>
          <div className="text-center">
            <p className="text-sm font-medium">Drop your manuscript here</p>
            <p className="mt-2 text-xs text-muted-foreground">
              or{" "}
              <span className="font-medium text-primary underline underline-offset-4">
                browse your files
              </span>
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            PDF · DOCX · TXT
          </span>
          <input
            id={id}
            type="file"
            accept=".pdf,.docx,.txt"
            className="sr-only"
            onChange={(e) => apply(e.target.files?.[0])}
          />
        </label>
      )}
      {error && (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
