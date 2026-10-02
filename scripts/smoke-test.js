#!/usr/bin/env node
/**
 * Non-destructive smoke tests for the static governance drafts site.
 * Checks that required pages and assets exist and that HTML files look well-formed.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
let failed = 0;
let passed = 0;

function ok(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`PASS  ${msg}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${msg}`);
  }
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function listHtml(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.join(dir, f));
}

console.log("Aboriginal Intelligence Test Hub — smoke tests\n");

// Core pages
const required = [
  "index.html",
  "contacts.html",
  "404.html",
  "assets/site.css",
  "assets/site.js",
  "_redirects",
];
for (const f of required) {
  ok(exists(f), `required file exists: ${f}`);
}

// Docs and forum catalogs should not be empty
const docs = listHtml("docs");
const forum = listHtml("forum");
ok(docs.length >= 10, `docs/ has HTML pages (found ${docs.length})`);
ok(forum.length >= 10, `forum/ has HTML pages (found ${forum.length})`);

// Spot-check elections draft (site context includes elections content)
ok(exists("docs/elections.html"), "docs/elections.html present");
ok(exists("documents/elections.pdf"), "documents/elections.pdf present");

// Basic HTML well-formedness on root + a sample of docs
const toCheck = ["index.html", "contacts.html", "404.html", ...docs.slice(0, 5)];
for (const rel of toCheck) {
  const html = read(rel);
  const lower = html.toLowerCase();
  ok(lower.includes("<html"), `${rel}: contains <html`);
  ok(lower.includes("</html>"), `${rel}: contains </html>`);
  ok(lower.includes("<head") || lower.includes("<body"), `${rel}: has head or body`);
  // No accidental empty file
  ok(html.trim().length > 100, `${rel}: non-trivial content (${html.length} bytes)`);
}

// index should link into docs or mention drafts
const index = read("index.html").toLowerCase();
ok(
  index.includes("docs/") || index.includes("draft") || index.includes("document"),
  "index.html references docs/drafts/documents"
);

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
