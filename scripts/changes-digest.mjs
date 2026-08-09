#!/usr/bin/env node
// Generates a per-chapter digest of every <ins>/<del> revision in the book:
// chapter title, a link, and an excerpt (with surrounding sentence context)
// around each change. Meant for the human read-through pass -- scanning 20
// chapters of full prose for five-word edits doesn't scale, this does.
//
// Usage: node scripts/changes-digest.mjs > /tmp/digest.json
//        node scripts/changes-digest.mjs --html > /tmp/digest.html

import { readdir, readFile } from 'node:fs/promises';
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
  const files = (await readdir(ROOT)).filter((f) => f.endsWith('.md'));
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
  } else {
    console.log(JSON.stringify(chapters, null, 2));
  }
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

await main();
