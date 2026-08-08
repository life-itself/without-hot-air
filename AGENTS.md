# House rules

`CLAUDE.md` is a symlink to this file, so any agent finds it.

David MacKay's *Sustainable Energy — Without the Hot Air*, as plain markdown,
published by Flowershow at https://withouthotair.org. The repo root is the
publish root: the markdown files *are* the site. There is no application code.

Split out of `life-itself/climate` in August 2026, with that repo's full history
preserved — early commits touch climate content that no longer lives here.

## The done condition

```
scripts/verify.sh
```

Exit 0 means the tree is structurally sound: frontmatter parses, links and
embeds resolve, every referenced figure exists, `config.json` is valid, no Git
LFS pointers. `scripts/init.sh` brings a cold checkout to that point.

After deploying, also run the live-site checks:

```
node scripts/smoke.mjs
```

and the browser checks:

```
node scripts/visual.mjs              # add SCREENSHOTS=1 to write screenshots/
```

Driven by `smoke.json` and `visual.json`. They catch what `verify.sh`
structurally cannot — a page that is valid markdown but renders wrongly. Both
are currently red on the maths (#3), which is the point of them. Not in the Stop hook: it needs
network and would fail spuriously mid-deploy. See `docs/handoff.md` in the
climate repo.

## Guard rails

- **Know which kind of change you are making.** `extract.py` produced the
  chapter markdown from `without-hot-air.epub`, but that was a one-time
  conversion — the markdown is the source of truth now, which is the whole point
  of a community edition, and every page carries an "Edit this page" link
  inviting exactly that.
  - **Conversion or formatting faults** — mangled markup, a botched figure path,
    a heading that came through wrong — are bugs in `extract.py`. Fix the script
    and re-run its relevant stage, so the fix applies everywhere.
  - **Content corrections and updates** — a wrong number, a dated claim, a typo
    in MacKay's text — are edited in the markdown directly. They are the work
    this project exists to enable.
  - Consequently, **a full re-extraction is now a destructive operation**: it
    would overwrite accumulated corrections. Treat `etl()` as historical.
    `python extract.py titles` is safe and idempotent.
- **Never weaken, skip, or delete a check to make it pass.**
- **Never rewrite or force-push `main`.**
- **The licensing is not yours to reword.** MacKay's original text is CC
  BY-NC-SA 2.0 UK; the cartoons and credited photographs are excluded from that
  licence entirely. Additions by others are dual-licensed. Carry the License and
  Credits sections of `README.md` verbatim — do not paraphrase, tidy, or
  summarise them.
- **Preserve the text.** This is a preservation project first. Do not silently
  modernise MacKay's prose, figures, or numbers. A revised edition is a
  deliberate, separately-marked act — not a side effect of a cleanup.

## Conventions

- Chapters are flat at the repo root; `assets/` holds all 384 figures.
- Internal links are wikilinks (`[[chap01]]`).
- Chapters carry a frontmatter `title`, written by `python extract.py titles`.
  Do not hand-edit those titles: the stage derives them from the heading
  wherever it sits in the file, and is idempotent. Flowershow only falls back to
  a level-1 heading when it leads the file, which most chapters' do not.
- No Git LFS.
- Commit messages: `[scope/N][size]: subject`.

## Current work

**Start here if picking this up cold:**
`docs/plans/2026-08-08-revising-the-book.md` — the plan for updating MacKay's
figures, written to be read without context.

Immediate blocker: **#3, the maths does not render.** LaTeX was emitted without
`$$` delimiters across 14 chapters, so it shows as literal text. It is a
conversion fault, so it is fixed in `extract.py`. Nothing in the audit phase can
proceed sensibly until arithmetic is legible.

`text-as-converted-2026-08-08` tags the text before any content revision — the
diff baseline. Re-cut it once #3 lands.
