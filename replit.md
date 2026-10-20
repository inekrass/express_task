# Running the imported project

This is a Node.js/Express API, not a visual frontend. Keep the existing ES-module structure and pinned dependencies.

## Development

- Runtime: Node.js 22 (the project requires Node.js >=22).
- Install dependencies with `npm ci`.
- Press **Run** to start the `Start application` workflow, which runs `PORT=5000 npm start`.
- Preview displays the API's plain-text response. `/` and `/login/` return the configured login identifier.
- Outside the workflow, `npm start` uses `PORT` if supplied, otherwise port 3000.
- No database, credentials, or environment secrets are required.

## Endpoints

- `GET /login/`: configured login identifier.
- `GET /code/`: streams the existing `app.js` source.
- `GET /sha1/:input/`: SHA-1 digest of the input.
- `GET /req/?addr=http%3A%2F%2Fexample.com%2F` or `POST /req/` with an `addr` JSON/form field: fetches an HTTP resource (HTTPS is not supported).
- Paths without a trailing slash redirect with status 308.

## Public-use caution

The imported `/req/` endpoint can fetch arbitrary HTTP addresses, including internal addresses, and `/code/` intentionally exposes source. Review these behaviors before publishing publicly; setup preserves the imported API behavior.
