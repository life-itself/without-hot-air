#!/usr/bin/env node
// Generates a per-chapter digest of every <ins>/<del> revision in the book:
// chapter title, a link, and an excerpt (with surrounding sentence context)
// around each change. Meant for the human read-through pass -- scanning 20
// chapters of full prose for five-word edits doesn't scale, this does.
//
// Usage: node scripts/changes-digest.mjs > /tmp/digest.json
//        node scripts/changes-digest.mjs --html > /tmp/digest.html
//        node scripts/changes-digest.mjs --markdown   # writes changes.md at repo root

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const SITE = 'https://withouthotair.org';
const CONTEXT_CHARS = 220; // characters of plain-text context either side

function frontmatterTitle(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const t = m[1].match(/^title:\s*"?([^"\n]*)"?/m);
  return t ? t[1] : null;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Find each <del>...</del> (optional) followed by <ins ...>...</ins>, or a
// standalone <ins> with no paired <del> (pure additions).
const CHANGE_RE = /(?:<del>([\s\S]*?)<\/del>\s*)?<ins\b[^>]*>([\s\S]*?)<\/ins>/g;

function extractChanges(body) {
  const changes = [];
  let m;
  while ((m = CHANGE_RE.exec(body))) {
    const [full, delText, insText] = m;
    const start = m.index;
    const end = start + full.length;
    const before = stripTags(body.slice(Math.max(0, start - CONTEXT_CHARS), start));
    const after = stripTags(body.slice(end, end + CONTEXT_CHARS));
    changes.push({
      before,
      removed: delText ? stripTags(delText) : null,
      added: stripTags(insText),
      after,
    });
  }
  return changes;
}

async function main() {
  // Exclude changes.md itself: it's this script's own output, and once
  // written it contains literal <ins>/<del> markup as *displayed* text, not
  // functional revision markers -- scanning it back in as a source produces
  // corrupted, self-referential entries.
  const files = (await readdir(ROOT)).filter((f) => f.endsWith('.md') && f !== 'changes.md');
  const chapters = [];

  for (const name of files.sort()) {
    const text = await readFile(path.join(ROOT, name), 'utf8');
    if (!text.includes('<ins ')) continue;
    const slug = name.replace(/\.md$/, '');
    const title = frontmatterTitle(text) || slug;
    const changes = extractChanges(text);
    if (changes.length === 0) continue;
    chapters.push({
      slug,
      title,
      url: `${SITE}/${slug}`,
      count: changes.length,
      changes,
    });
  }

  if (process.argv.includes('--html')) {
    console.log(renderHtml(chapters));
  } else if (process.argv.includes('--markdown')) {
    const out = path.join(ROOT, 'changes.md');
    await writeFile(out, renderMarkdown(chapters));
    console.error(`wrote ${out}`);
  } else {
    console.log(JSON.stringify(chapters, null, 2));
  }
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Markdown-only: the original chapter text carries custom footnote-anchor
// markup like `[<span class="darkred">[2]</span>](#chDn02)`. Stripping the
// span tags (stripTags, above) leaves the bracket characters behind, and
// adjacent `[`s from that pattern can collapse into what looks like a
// `[[wikilink]]` once assembled onto this page -- verify.sh correctly
// catches it as a link to nothing, since it never was one. Escape brackets
// in excerpt text (never in the wikilinks/footnote markers this script adds
// itself) so they render as plain punctuation instead.
function escExcerpt(s) {
  return esc(s).replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function renderHtml(chapters) {
  const totalChanges = chapters.reduce((n, c) => n + c.count, 0);
  const body = chapters
    .map(
      (c) => `
    <section class="chapter">
      <h2><a href="${c.url}">${esc(c.title)}</a> <span class="count">${c.count} change${c.count === 1 ? '' : 's'}</span></h2>
      ${c.changes
        .map(
          (ch) => `
      <p class="excerpt">…${esc(ch.before)}
        ${ch.removed ? `<del>${esc(ch.removed)}</del> ` : ''}<ins>${esc(ch.added)}</ins>
        ${esc(ch.after)}…</p>`
        )
        .join('\n')}
    </section>`
    )
    .join('\n');

  return `<!doctype html><meta charset="utf-8"><title>Changes digest</title>
<style>
  body { font-family: Georgia, serif; max-width: 760px; margin: 40px auto; line-height: 1.6; }
  h1 { font-family: -apple-system, sans-serif; }
  h2 { font-size: 20px; border-top: 1px solid #ddd; padding-top: 24px; }
  h2 a { color: inherit; }
  .count { font-family: -apple-system, sans-serif; font-size: 12px; color: #888; font-weight: normal; }
  .excerpt { font-size: 15px; color: #333; }
  del { color: #999; }
  ins { color: #a3540f; background: #fbeee0; text-decoration: none; padding: 0 3px; border-radius: 3px; }
</style>
<h1>Changes digest — ${chapters.length} chapters, ${totalChanges} edits</h1>
${body}`;
}

function renderMarkdown(chapters) {
  const totalChanges = chapters.reduce((n, c) => n + c.count, 0);
  const toc = chapters
    .map((c) => `- [[${c.slug}|${esc(c.title)}]] — ${c.count} change${c.count === 1 ? '' : 's'}`)
    .join('\n');

  const sections = chapters
    .map((c) => {
      const changes = c.changes
        .map(
          (ch) => `&hellip;${escExcerpt(ch.before)} ${
            ch.removed ? `<del>${escExcerpt(ch.removed)}</del> ` : ''
          }<ins style="color:#a3540f;background:#fbeee0;padding:0 3px;border-radius:2px;font-weight:600;">${escExcerpt(ch.added)}</ins> ${escExcerpt(ch.after)}&hellip;`
        )
        .join('\n\n');
      return `## [[${c.slug}|${esc(c.title)}]]\n\n${changes}`;
    })
    .join('\n\n');

  return `---
title: Changes
description: Every dated-claim update made to this edition since MacKay's 2008 text, with context.
---

# Changes

${chapters.length} chapters revised so far, ${totalChanges} individual updates. Each excerpt below shows a change
in context — <del>struck-through</del> is MacKay's 2008 original, <ins style="color:#a3540f;background:#fbeee0;padding:0 3px;border-radius:2px;font-weight:600;">highlighted</ins> is ours, dated and sourced. Click a
chapter heading to read it in full, including the citation for every change in that chapter's own "Updates" section.

This page is generated from the chapter markdown by \`scripts/changes-digest.mjs\` — nothing here is
hand-maintained, so it stays accurate as more chapters are revised.

${toc}

---

${sections}
`;
}

await main();
