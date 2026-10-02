# Aboriginal Intelligence Test Hub

Test / CI copy of the public site content from
[`aboriginalintelligence/aboriginalintelligence.github.io`](https://github.com/aboriginalintelligence/aboriginalintelligence.github.io).

**Working drafts for First Nation self-government. Not adopted law.**

## What this repo is

- Mirrors the static HTML/CSS/JS site (docs, forum, documents, assets).
- Adds a lightweight, non-destructive smoke-test suite and GitHub Actions CI.
- Safe place to iterate on tests without changing the live GitHub Pages site.

## Run tests locally

```bash
npm test
```

No npm dependencies are required. Node 18+ is enough.

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs `npm test` on push and pull request to `main`.
