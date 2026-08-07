# House rules

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

## Guard rails

- **The chapter markdown is generated output.** `extract.py` produces it from
  `without-hot-air.epub`. Fix the script and re-run; never hand-patch a chapter,
  or the next regeneration silently loses the fix.
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
- Chapters carry no frontmatter — their `# ` heading supplies the title, and
  adding frontmatter by hand would mean editing generated files.
- No Git LFS.
- Commit messages: `[scope/N][size]: subject`.
