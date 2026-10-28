# Deployment target and current blocker

Target: an **assets-only Cloudflare Worker**, `chalk-and-dynasty`, on the account's
`workers.dev` subdomain. No paid product, database, custom domain, account provisioning,
or billing change has been requested or created.

The current production build and `cf deploy --dry-run` pass. This verifies packaging,
not publication. A real deploy was attempted with the already-built output:

```sh
npx cf deploy --prebuilt --mode production
```

It exits before upload with **No authentication token found**. `npx cf auth whoami`
reports `authenticated: false`, and no CLOUDFLARE_API_TOKEN variable was present.
No Worker has been created and no public game URL has been verified.

## Precise outside action

The cloud-environment draft now contains a `CLOUDFLARE_API_TOKEN` secret requirement,
targeted only to HTTPS `api.cloudflare.com`. Supply the value through secure environment
settings, never chat or source code. A token scoped to the intended Cloudflare account
needs **Account / Workers Scripts / Edit** for uploading and deploying the assets-only
Worker, plus **Account / Account Settings / Read** for account selection. No zone/DNS
or billing permissions are needed for this target.

The existing restricted domain policy also rejected the Cloudflare documentation host
with HTTP 403 at the CONNECT proxy. Necessary additions were saved in the draft:
`developers.cloudflare.com`, `api.cloudflare.com`, `dash.cloudflare.com`, and
`*.workers.dev`. Research/source hosts were saved separately in the same custom list:
`82-0.com`, `www.82-0.com`, `www.basketball-reference.com`. Existing package-manager
presets were preserved. Saving the draft alone does not apply those rules at runtime.

In **environment settings**, review and save the changes, securely provide the token,
then **publish the environment** as required by the configuration tool. On resumption,
first verify the binding/network operation, then check authentication/account access and
run the prepared deployment. Finally load the actual returned HTTPS URL in desktop and
mobile Chromium and verify a complete draft and possession. Do not report a public link
until that has worked.

An alternative is the account owner's supported OAuth connection (`npx cf auth login
--no-browser`), once runtime network access permits it. The default global config
locations are read-only in this managed machine, so secure environment binding is the
prepared path; do not copy credentials into the checkout as a workaround.

## Official setup instructions

The requested URL was attempted first:
https://developers.cloudflare.com/agent-setup/prompt.md

That specific origin was blocked by this environment's network policy. The official
Cloudflare GitHub source was independently read from an already-allowed destination:
https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/agent-setup/prompt.md

The official Cloudflare and Wrangler skills were installed in the checkout's ignored
`.agents/skills` directory. Global skill/MCP registration could not write to the managed,
read-only `/home/agent/.agents` and `/home/agent/.codex` locations. No attempt was made
to override that restriction. The installed Cloudflare skill chooses the project-local
`cf` CLI for a new project, so the finished game uses that supported CLI rather than
requiring a globally registered MCP server.

Additional official references reviewed from Cloudflare's public GitHub documentation:

- `src/content/docs/cf/projects/index.mdx`
- `src/content/partials/workers/cloudflare-config.mdx`
- `src/content/docs/cf/get-started/first-worker.mdx`
- Installed `@cloudflare/vite-plugin` type definitions for assets-only configuration.

The installed CLI is cf 0.15.0; `cf init` is absent in that release despite newer docs
showing it. Configuration was therefore written against the installed supported APIs
and validated by the real CLI dry run. The plugin is pinned in the lockfile.

No network rule has been bypassed, no TLS/checksum verification disabled, and no
credentials have been printed, stored in source, or requested in chat.
