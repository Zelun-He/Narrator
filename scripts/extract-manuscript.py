"""Extract readable manuscript text; never execute uploaded content."""
import json
import sys
# Cap malformed document parsing on Unix; subprocess timeout also applies.
try:
    import resource
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_CPU, (25, 25))
except ImportError:
    pass
import zipfile
from pathlib import Path

MAX_CHARS = 1_000_000


def extract(file_path):
    path = Path(file_path)
    if path.suffix.lower() == ".docx":
        from docx import Document
        from docx.table import Table
        with zipfile.ZipFile(path) as archive:
            entries = archive.infolist()
            if len(entries) > 2000 or sum(entry.file_size for entry in entries) > 40 * 1024 * 1024:
                raise ValueError("This DOCX is too large after extraction. Please upload a smaller manuscript.")
            if any(entry.flag_bits & 1 for entry in entries):
                raise ValueError("Please upload an unencrypted DOCX file.")
        document = Document(path)
        parts = []
        total = 0
        for item in document.iter_inner_content():
            text = "\n".join("\t".join(cell.text for cell in row.cells) for row in item.rows) if isinstance(item, Table) else item.text
            total += len(text)
            if total > MAX_CHARS:
                raise ValueError("The manuscript contains too much text. The limit is 100,000 words.")
            parts.append(text)
        return "\n\n".join(parts)
    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(path)
        if reader.is_encrypted:
            raise ValueError("Please upload an unencrypted PDF file.")
        if len(reader.pages) > 1000:
            raise ValueError("Please upload a PDF with no more than 1,000 pages.")
        parts = []
        total = 0
        for page in reader.pages:
            text = page.extract_text() or ""
            total += len(text)
            if total > MAX_CHARS:
                raise ValueError("The manuscript contains too much text. The limit is 100,000 words.")
            parts.append(text)
        text = "\n\n".join(parts)
        if not text.strip():
            raise ValueError("This PDF has no readable text. Use a text-based PDF, DOCX, or TXT file; scanned pages need OCR first.")
        return text
    raise ValueError("Unsupported manuscript format.")


try:
    text = extract(sys.argv[1])
    print(json.dumps({"text": text}, ensure_ascii=False))
except ValueError as exc:
    print(json.dumps({"error": str(exc)}))
    sys.exit(2)
except Exception:
    print(json.dumps({"error": "This document couldn’t be read. Please try a valid DOCX, text-based PDF, or UTF-8 TXT file."}))
    sys.exit(2)
