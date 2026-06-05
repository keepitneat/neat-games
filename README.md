# Neat Games

Small offline logic games. No ads, no tracking. Part of [Keep It Neat](https://keepitneat.app).

Live: https://games.keepitneat.app

## Games

- **Crowns** (`/crowns/`) — place one crown per row, column, and color region;
  no two touching. Procedurally generated; a date-seeded Daily puzzle (same for
  everyone, no server) plus Endless mode with Easy/Medium/Hard sizes.

## Develop

Vanilla HTML/CSS/JS, ES modules, no build step.

```bash
python3 -m http.server 8767
# Hub:    http://localhost:8767/
# Crowns: http://localhost:8767/crowns/
```

A static server is required — `file://` breaks ES modules and the service worker.

## Test

```bash
node --test            # all pure-logic unit tests (shared/ + crowns/)
```

## License

MIT — see LICENSE.
