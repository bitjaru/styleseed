# Draft browser acceptance protocol v1

This protocol is identical in A/B/C/D. It defines test access, not layout, visual style,
expert approval, or a production API. The evaluator and its calibration fixtures remain
operator-only. Passing it is not a design-quality score or complete accessibility audit.

## Safe test boundary

Run a disposable local app without credentials or production data. The browser runner accepts
only an explicit `http://127.0.0.1:<port>` origin, blocks off-origin requests, WebSockets and
service workers, and requires `<meta name="styleseed-pilot-protocol" content="1">` on each
initial document. It does not start, build, install or execute candidate source code.
HTTP redirects, including same-origin redirects, are refused: serve these canonical routes directly.
Test state resets on a fresh browser context; list/detail/settings state survives in-app navigation.
Do not implement evaluator-specific pass messages or inspect operator fixtures.

## Test controls and selectors

Support query parameters `role=editor|viewer` (default editor), and `fixture`:
`loaded` (default), `list-loading`, `list-error`, `empty`, `detail-loading`, `detail-error`,
`history-unavailable`, `save-failure`. These are explicit synthetic scenarios, not URL-based
production permissions. A labelled `Save outcome` select with `success` / `failure` options
in a separate fixture-control region changes the next save outcome without resetting the draft.
Request-error retry restores loaded data. Loading fixtures stay pending until reconfigured.

Use semantic HTML and accessible names. Exact hook names below make the same tests reusable;
the surrounding copy and composition are not prescribed.

- Named `Primary` navigation with links `Resources` and `Settings`.
- On `/resources`: heading `Resources`, labelled `Search resources` input and `Status filter`
  select (`all`, `active`, `paused`); labelled `Select all visible` checkbox; each resource row
  has `data-resource-id="<id>"`, a checkbox `Select <resource name>`, a link named for the resource,
  and `data-field="status"` containing `active` or `paused`.
- Selected count uses `data-testid="selected-count"` containing just the integer. Buttons:
  `Clear selection`, `Pause selected`. A modal dialog `Pause resources` lists affected names
  and count, and has `Cancel` / `Confirm pause`. Success has a status announcement; refusals
  have an alert with a reason. Cancellation preserves selection and records.
- On detail routes: heading is the resource name; hooks `resource-status`, `resource-owner`,
  `resource-protection`, `resource-history`; link `Back to resources` preserves list filters.
  Unavailable history is explicitly different from empty history. Unknown IDs announce an alert.
- On `/settings`: heading `Settings`; labels `Workspace name`, `Digest frequency`, `Retention days`;
  `Save settings` button; `data-testid="unsaved"` shows `Unsaved changes` or `No unsaved changes`.
  Invalid inputs set `aria-invalid="true"` and reference non-empty adjacent messages through
  `aria-describedby`. Disable duplicate submits while saving; announce saving/success through
  status and failure through alert. Viewer saves are disabled with a visible permission reason.
- Dirty in-app navigation opens a modal `Discard changes?` with `Stay` / `Discard` buttons.
  Stay retains draft and route; discard restores the last saved values, not the initial fixture.
- Loading uses a visible status with `Loading`; request errors use an alert plus `Retry`.
  Empty dataset uses `data-testid="empty-dataset"`; filtered no-results uses `no-results`.
  Viewer restrictions use `data-testid="permission-reason"` and visible explanatory text.

Control areas must stay keyboard-accessible at 1440×900 and 390×844, with visible focus and
44px click/touch targets (a checkbox's label can provide the target). Required content must
not cause document-wide horizontal overflow. Reduced-motion contexts must not run infinite or
long (>500ms) animations. These mechanical checks do not measure all contrast, semantics or UX.

## Explicit coverage limits

The suite exercises observable browser behavior, not arbitrary unknown-ID mutation injection,
server authorization, cross-tab persistence, a full screen-reader audit, React/library source
reuse, pixel quality or expert judgment. Native reload/back/unload dirty-navigation behavior
requires a separately approved policy; v1 checks the named in-app links only. The follow-up
task stays held out. This protocol is a draft requiring expert approval before a quality trial.
