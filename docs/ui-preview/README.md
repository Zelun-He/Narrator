# Author studio preview and validation

The redesign introduces a paper-and-ink palette, editorial headings, book-cover previews, a searchable bookshelf, and responsive navigation. It is centered on free creation for authors rather than analytics or a fictional signed-in account.

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

## Existing backend limitations

The real preview request returns an error on Linux because the bundled Piper engine targets Windows. The existing store can simulate completed progress without audio, PDF/DOCX extraction is experimental, hosted filesystem writes are not durable, and MP3/M4B/ZIP exports remain placeholders. Those backend behaviors were not replaced in this UI-focused change. The interface and public guide disclose available input/audio capabilities rather than offering nonfunctional export buttons.

The screenshots use the repository's existing demonstration records. Test records and uploads were cleaned up after verification.
