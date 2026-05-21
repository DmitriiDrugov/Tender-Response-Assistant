# Codex Task Batch — Bug Fixes from Audit 2026-05-21

Read `AGENTS.md`, `CODEX.md`, and `PRODUCT.md` before starting. Each task below is
independent — implement and commit them separately. Do not bundle unrelated changes.

Run `npm run typecheck` and `npm run lint` after each task and fix any errors before
moving on. Do not mark a task done if either command fails.

---

## Task 1 — Reviewer notes autosave: surface save errors to the user

**File:** `components/RequirementRow.tsx`
**Function:** `ReviewerControls` (starts around line 346)

### Problem

The `DraftEditorEditable` component (same file) has full error handling for its autosave:
it sets an `error` state, renders a `role="alert"` paragraph, and never swallows failures.

The `ReviewerControls` notes autosave does not. When the `PATCH /api/requirements/[id]`
call returns a non-ok response, the failure is silently ignored — the user's notes are
lost with no indication.

### Required changes

1. Add an `error` state (`string | null`, initially `null`) to `ReviewerControls`.
2. In the autosave `useEffect` (the one that debounces `notes`), after `await fetch`:
   - If `res.ok`, clear the error and call `onUpdated`.
   - If `!res.ok`, parse the JSON body for an `error` string and set the error state.
   - Wrap the whole async block in try/catch; on catch, set error to `"Network error. Will retry on next change."`.
3. Render the error below the textarea using the same pattern as `DraftEditorEditable`:
   ```tsx
   {error ? (
     <p role="alert" className="text-12 text-accent">{error}</p>
   ) : null}
   ```
4. Clear the error whenever the notes value changes back to the last successfully saved value.

### Acceptance criteria

- A network error or API 5xx during notes autosave is shown inline below the textarea.
- The error clears as soon as the user types a new character (triggering a fresh attempt).
- No change to the save debounce timing (800 ms stays the same).
- `npm run typecheck` passes.

---

## Task 2 — Document status cycling: add error feedback to SidePanel

**File:** `components/SidePanel.tsx`
**Function:** `DocumentsSection` (starts around line 124)

### Problem

The button that cycles a required document's status calls `fetch` then `onRefresh`.
If the PATCH fails (API error, network issue), `onRefresh` is still called, the UI
reverts to the old server state, and the user receives no feedback. They may click
repeatedly without knowing what is wrong.

### Required changes

1. Convert the inline `onClick` to a named async handler (e.g. `handleStatusCycle`).
2. Add an `error` state (`string | null`) to `DocumentsSection`.
3. In the handler:
   - On `!res.ok`: parse the error body, set the error state, **do not** call `onRefresh`.
   - On `res.ok`: clear the error, call `onRefresh`.
   - On network throw: set `error` to `"Network error."`.
4. Render the error at the top of the documents list (above the `<ul>`):
   ```tsx
   {error ? (
     <p role="alert" className="text-12 text-accent mb-2">{error}</p>
   ) : null}
   ```
5. Clear the error when any subsequent successful cycle completes.

### Acceptance criteria

- A failed status update shows an inline error message in the panel.
- A successful update after a failure clears the message.
- `npm run typecheck` passes.

---

## Task 3 — Blocked draft: show context-appropriate message

**File:** `components/RequirementRow.tsx`
**Function:** `DraftEditorEditable` (starts around line 218)

### Problem

When `r.draft_status === 'blocked'`, the component renders:

```tsx
<p className="text-14 text-ink-2">
  Draft response requires evidence. No supporting capability was found.
</p>
```

This message is only correct for one of three reasons a draft can be blocked
(see `lib/llm/draft-guard.ts`). The actual reason is encoded in `r.draft_response`,
which is always set to a `[REQUIRES BID MANAGER DECISION] <reason>` string by the guard.

The message shown should be derived from `r.draft_response` rather than being hardcoded.

### Required changes

1. In the `isBlocked` branch, instead of the hardcoded paragraph, render the
   `draft_response` string. Strip the leading `[REQUIRES BID MANAGER DECISION] ` prefix
   before displaying so the UI reads as a natural sentence.

   ```tsx
   {isBlocked ? (
     <p className="text-14 text-ink-2">
       {(r.draft_response ?? '')
         .replace(/^\[REQUIRES BID MANAGER DECISION\]\s*/i, '')
         .trim() || 'Draft requires bid manager decision.'}
     </p>
   ) : ...}
   ```

2. If `draft_response` is null or empty after stripping (defensive fallback), show
   `"Draft requires bid manager decision."`.

3. Do not change the `isFailed` branch. Do not add any other text.

### Acceptance criteria

- A blocked requirement shows the actual reason from the guard, not a generic message.
- The `[REQUIRES BID MANAGER DECISION]` prefix never appears in the UI.
- If `draft_response` is null, a sensible fallback is shown.
- `npm run typecheck` passes.

---

## Task 4 — PDF text truncation: warn the user when the document was clipped

### Context

`app/api/tenders/[id]/extract/route.ts` silently truncates the tender text at 120 000
characters before sending it to the LLM. For a 200-page tender, this cuts off roughly
the second half of the document. Requirements in the truncated portion are never
extracted. There is no indication of this anywhere in the UI.

### Sub-task 4a — API route: expose truncation flag

**File:** `app/api/tenders/[id]/extract/route.ts`

1. After computing `tenderText`, determine whether truncation occurred:
   ```ts
   const wasTruncated = rawText.length > MAX_TEXT_CHARS;
   ```
2. Include `was_truncated` in the final success response:
   ```ts
   return NextResponse.json({
     ok: true,
     requirement_count: output.requirements.length,
     was_truncated: wasTruncated,
   });
   ```
3. If truncated, update the tender's `last_error` field with an informational string
   (not a fatal error — extraction still succeeded):
   ```ts
   if (wasTruncated) {
     await sb.from("tenders").update({
       last_error: `Document was truncated to ${MAX_TEXT_CHARS.toLocaleString()} characters (${Math.round(rawText.length / 1000)} k total). Requirements beyond this point were not extracted.`,
     }).eq("id", id);
   }
   ```
   Do this **after** the final `extraction_status: "complete"` update, so the status
   is not overwritten.

### Sub-task 4b — UI: show the truncation warning on the tender page

**File:** `components/TenderHeader.tsx`

The `TenderHeader` receives the full `TenderFull` object (which includes `last_error`).
Currently it only shows pipeline status. Add a truncation notice if `last_error` is
present and `extraction_status === 'complete'` (i.e., extraction succeeded but left a
warning).

1. Inside `TenderHeader`, after the existing content, add:
   ```tsx
   {tender.extraction_status === 'complete' && tender.last_error ? (
     <p className="text-13 text-ink-muted max-w-reading">
       <span className="label mr-1.5">Note</span>
       {tender.last_error}
     </p>
   ) : null}
   ```
2. Do not show this banner when `extraction_status === 'failed'` — that case is already
   handled elsewhere.

### Acceptance criteria

- After extracting a large PDF, if truncation occurred, `last_error` in the DB contains
  the informational message, and `extraction_status` is `'complete'` (not `'failed'`).
- The tender detail page shows the truncation note below the header metadata.
- If no truncation occurred, `last_error` is `null` and nothing is shown.
- `npm run typecheck` passes.

---

## Commit format

One commit per task, imperative lowercase verb, under 72 chars:

```
fix reviewer notes autosave to surface save errors
fix document status cycling to show api errors
fix blocked draft message to show guard reason
add pdf truncation warning to extract route and header
```

Do not bundle tasks. Do not amend existing commits.
