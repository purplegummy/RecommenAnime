# RecommenAnime

**Graph-neural-network-powered anime recommendations.** Pick a few anime you like and RecommenAnime finds similar titles using embeddings learned by a heterogeneous GNN.

🔗 **Live demo:** [recommen-anime.vercel.app](https://recommen-anime.vercel.app)

<!-- TODO: add a screenshot or GIF of the app, e.g. ![RecommenAnime demo](public/demo.gif) -->

---

## Features

- **Seed-based recommendations**: choose one or more anime as seeds and get ranked recommendations instantly
- **Dynamic filtering**: narrow results without re-running the whole pipeline
- **Seed reordering and feedback**: adjust your seeds and see recommendations update in real time
- **Franchise deduplication**: sequels and spin-offs of the same series don't flood the results
- **Cold-start fallbacks**: sensible results even when a title has weak embedding signal
- **Responsive UI**: in-flight requests are cancelled when inputs change, so the UI never shows stale results

## How it works

```
 Offline (Python)                          Online (Next.js on Vercel)
┌───────────────────────────┐            ┌──────────────────────────────────────┐
│ Anime / user interaction  │            │  React client                        │
│ data → heterogeneous graph│            │   │  seeds + filters                 │
│           │               │            │   ▼                                  │
│ PyTorch Geometric GNN     │            │  Typed API route                     │
│           │               │            │   │  validation + pagination         │
│ 64-dim anime embeddings ──┼── export ─▶│  Recommendation service              │
└───────────────────────────┘            │   • cached catalog + embeddings      │
                                         │   • cosine similarity ranking        │
                                         │   • filtering + franchise dedup      │
                                         │   • cold-start fallback              │
                                         └──────────────────────────────────────┘
```

1. **Training (offline):** A heterogeneous graph neural network built with PyTorch Geometric learns a 64-dimensional embedding for each anime.
2. **Serving (online):** The embeddings and catalog are loaded and cached server-side. A request's seed titles are combined and compared against the catalog by cosine similarity, then filtered, deduplicated by franchise, and paginated.
3. **Client:** The React frontend manages recommendation state asynchronously, cancelling outdated requests as the user changes seeds or filters.

<!-- TODO: add catalog size and typical response time, e.g. "Serves recommendations over N titles in ~X ms" -->

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| Backend | Next.js API routes (TypeScript) |
| ML | Python, PyTorch Geometric |
| Deployment | Vercel |

## Project structure

```
app/          Next.js pages and API routes
components/   React UI components
lib/          Recommendation logic and shared types
data/         Precomputed embeddings and anime catalog
public/       Static assets
```

<!-- TODO: if the GNN training code lives in another repo, link it here. Otherwise, add it under a training/ folder. -->

## Running locally

```bash
git clone https://github.com/purplegummy/RecommenAnime.git
cd RecommenAnime
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Author

Built by [Prasit Dhungyel](https://github.com/purplegummy) · [LinkedIn](https://www.linkedin.com/in/prasit-dhungyel-1856a3271/)
