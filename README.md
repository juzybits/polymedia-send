# Polymedia zkSend

Send any Sui coin simply by sharing a link.

![Polymedia zkSend](./web/public/img/open-graph.webp)

## Local development

```
cd web/
pnpm install
pnpm dev
```

## App structure

The app uses React + TypeScript + Vite. Key files:

```
web/
├── index.html            The initial HTML. Loads _init.tsx.
├── src/
│   ├── _init.tsx         Bootstraps React. Loads App.tsx.
│   ├── App.tsx           Bootstraps router, Sui providers, and the app. Loads a Page*.tsx.
│   ├── Page*.tsx         Each page has its own .tsx file
│   ├── lib/              Helpers, hooks, components
│   │   └── zksend/       Fork from @mysten/zksend to support contract-less bulk link creation
│   └── styles/           CSS (LESS)
├── public/               Images and other static assets
└── functions/            CloudFlare Pages Functions (serverless workers)
    └── proxy/
        └── [[path]].ts   A proxy to https://zksend.com/api to avoid CORS errors
```
