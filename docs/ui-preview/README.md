# Author studio preview and validation

The redesign introduces a paper-and-ink palette, editorial headings, book-cover previews, a searchable bookshelf, and responsive navigation. It is centered on free creation for authors rather than analytics or a fictional signed-in account.

## Narrator identity and header

The custom logo combines an open book with three sound bars. Forest green, cream,
and warm gold keep the mark recognizable at small sizes. Editable SVG marks and
light/dark wordmarks live in `public/brand`, alongside the multi-size ICO,
32-pixel PNG favicon, and 180-pixel Apple touch icon. Browser metadata uses new
asset paths so the former favicon does not persist through the old cache key.

The library photograph supplied by the project author is used for the dashboard
header. It is encoded as WebP without changing the source composition, with
responsive cropping and a dark overlay for readable text in either theme.
Desktop/mobile layouts, icon responses, header loading, and light/dark homepage
accessibility were verified after these updates.

## Workflow changes

- Manuscript details remain in the form until the author reviews the narrator and starts creation.
- Empty or unsupported files are rejected; titles are suggested from filenames.
- Narration requests are awaited. A failed request retains the uploaded book ID so retrying does not upload another copy.
- Voice previews support pause/resume, report failures, and release audio objects when leaving the page.
- Progress polling stops at terminal statuses and exposes load errors and recovery links.
- The listening room only selects chapters with audio URLs. It links directly to real WAV audio instead of the placeholder export endpoint.
- Deletion requires confirmation and reports API failures.

## Validation

- `npm run build` passed.
- `npx tsc --noEmit` passed independently of the repository's existing `ignoreBuildErrors` setting.
- Playwright checks passed for library search/filtering, file validation, review-before-upload, preserved form details, mobile navigation, deletion/cancellation, and theme switching.
- Real API upload, readback, and deletion were checked with a temporary TXT manuscript; bundled WAV playback and download were checked in the browser.
- Generation failure was mocked to verify retained upload state and retry without duplicate uploads. This does not validate successful speech generation.
- Review layouts had no horizontal overflow at 320, 390, and 768 pixels. Desktop/mobile screenshots were visually inspected.
- Axe checks found no WCAG 2 A/AA or WCAG 2.1 AA violations on the six main pages in their default states. Automated checks do not replace manual accessibility review.
- `npm run lint` is blocked by the existing missing ESLint dependency/configuration.

## Local development stylesheet recovery

The studio theme and component rules now live in `app/studio.css`, explicitly
imported by the dashboard layout. This keeps the new interface styling in the
same import graph as the new dashboard rather than relying on an older cached
base stylesheet. Clean development rendering was verified on desktop and mobile,
including a check using the original base stylesheet alongside the studio file.

For local layouts that still display the old styles, stop the dev server, pull
this branch, and run `npm run dev:clean` or `pnpm dev:clean`. The command removes
only generated `.next` output before restarting Next.js.

## Existing backend limitations

The real preview request returns an error on Linux because the bundled Piper engine targets Windows. The existing store can simulate completed progress without audio, PDF/DOCX extraction is experimental, hosted filesystem writes are not durable, and MP3/M4B/ZIP exports remain placeholders. Those backend behaviors were not replaced in this UI-focused change. The interface and public guide disclose available input/audio capabilities rather than offering nonfunctional export buttons.

The screenshots use the repository's existing demonstration records. Test records and uploads were cleaned up after verification.
