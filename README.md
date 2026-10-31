# Mehnat muhofazasi — bilim sinovi

Static Uzbek Latin self-assessment site. Serve `dist/` over HTTP (ES modules require HTTP):

```sh
python3 -m http.server 8080 --directory dist
```

Run `./start.sh` from this directory to start a local preview at http://localhost:8080.

30 supplied questions and answer key are in `dist/questions.js`. Scoring uses the supplied boundaries. Attempt state and complete result history use one localStorage document, `mehnat-bilim-v1`; no student information is transmitted to a backend. The key is bundled client-side for self-study, not secure examination.

No external fonts, libraries, services, or build dependencies are required. The legal note is preserved; test content has not been independently legally verified.

Tests: `gjs -m tests/check.mjs` verifies content, grade boundaries, navigation, persistence, history and storage failure using the actual application handlers with a DOM adapter. This does not replace visual or native browser testing. Chrome could not launch in the current sandbox (socket permission restriction).

Publication is not complete: Sites project identity is saved in `.openai/hosting.json`, but this environment lacks Node.js and cannot resolve the Sites Git source host. Resume publication using the existing project ID; do not create a second Site.
