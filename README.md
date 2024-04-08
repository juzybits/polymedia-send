# Polymedia Send

Send any coin with Sui zkSend, and create zkSend links in bulk.

![Polymedia Send](./web/public/img/open-graph.webp)

## Development

```
cd web/
pnpm install
pnpm dev
```

Then visit http://localhost:1234

`pnpm dev` starts both the Vite dev server on port 1234 (with hot reloading), and the CloudFlare Pages Function on port 8787 (without hot reloading).

## Overview

This is a serverless app built with React, TypeScript, and Vite.

However there is 1 server-side component: an API to sponsor claim transactions which is run by Mysten Labs on `https://zksend.com/api`.

To void CORS errors, we use a CloudFlare Pages Function (a serverless platform similar to AWS Lambda) to proxy requests to the API endpoint.

### Key files and directories:

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
