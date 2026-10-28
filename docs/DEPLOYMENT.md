# Live Cloudflare deployment

**Play: https://chalk-and-dynasty.tyhoag.workers.dev**

The complete game is published as an **assets-only Cloudflare Worker** named
`chalk-and-dynasty`, using the account's existing `tyhoag.workers.dev` subdomain.
No database, paid resource, custom domain, account provisioning, or billing change
was created.

- Application source commit: `1a93abe055339f1e98bfce17e98696880886adb1`.
- Cloudflare version: `2802f380-7b28-4ea4-a727-ed8839553d87`.
- Account ID: `516850fdbfa65daee3e49f0ed2504d3d` (public identifier).
- The simplified play editor update uploaded three changed assets and reused three unchanged assets;
  the Worker and `workers.dev` trigger deployed successfully.
- Public HTTPS returns 200 and the expected game title and five draft candidates.
- Browser tests target the actual public URL; see [validation](VALIDATION.md).

## Updating the game

The existing secure `CLOUDFLARE_API_TOKEN` binding is targeted only to HTTPS
`api.cloudflare.com`. Never put its value in chat, source, or command arguments.
The prepared scope is **Account / Workers Scripts / Edit** and
**Account / Account Settings / Read**, restricted to the intended account. No zone/DNS
or billing permissions are needed for this assets-only target.

The managed environment requires Node's supported environment-proxy activation:

```sh
npm test
npm run deploy:check
NODE_USE_ENV_PROXY=1 CLOUDFLARE_ACCOUNT_ID=516850fdbfa65daee3e49f0ed2504d3d npm run deploy
```

To deploy already-validated output without rebuilding, preserve its production mode:

```sh
NODE_USE_ENV_PROXY=1 CLOUDFLARE_ACCOUNT_ID=516850fdbfa65daee3e49f0ed2504d3d \
  npx cf deploy --prebuilt --mode production
```

Check the actual printed version and URL. A dry run only validates packaging.
After deployment, run the browser suite against the public URL:

```sh
PLAYWRIGHT_BASE_URL=https://chalk-and-dynasty.tyhoag.workers.dev npm run test:browser
```

The Linux test browser must be able to read and initialize Chromium's NSS trust store.
The workspace sandbox prevented that, initially causing `ERR_CERT_AUTHORITY_INVALID`.
The environment's already-supplied proxy CA was checked against the existing trusted
certificate and installed with `certutil` through approved tool escalation, following
Chromium's official Linux certificate-management instructions. Running the browser
with approved access to its certificate store then produced HTTP 200 with TLS verification
fully enabled. No `ignoreHTTPSErrors`, certificate-error bypass, or disabled TLS was used.
If this occurs in another task, use the supported browser runtime or request access to
the established trust store; do not bypass certificate verification.

## Network configuration

The saved restricted policy includes these deployment/documentation hosts:
`developers.cloudflare.com`, `api.cloudflare.com`, `dash.cloudflare.com`,
`*.workers.dev`. Source/research hosts are also retained in the custom list:
`82-0.com`, `www.82-0.com`, `www.basketball-reference.com`.
Package-manager presets remain preserved. The game itself uses only its own static
files and has no live sports-data dependency or player-facing credential requirement.

The user supplied and activated the secure token binding and applied the network
configuration. Initial API access failed because the token's `not_before` date was
in the future. The owner corrected that date; account-specific Workers access then
returned 200. No replacement token or broader permissions were needed.

An expiration only prevents future deployments using that token. It does not remove
the already-published game. A later update needs a still-valid authorized credential.

## Official setup references

The requested setup URL was attempted first:
https://developers.cloudflare.com/agent-setup/prompt.md

While that origin was blocked by the original policy, the official Cloudflare GitHub
source was independently read from an already-allowed destination:
https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/agent-setup/prompt.md

Project-local Cloudflare skills are in ignored `.agents/skills`. The managed global
skill/MCP config locations were read-only, so global MCP registration was not completed.
The installed Cloudflare skill chooses the project-local `cf` CLI for a new project;
that CLI successfully performed this deployment.

Additional official references:

- Cloudflare docs: `src/content/docs/cf/projects/index.mdx`.
- Cloudflare docs: `src/content/partials/workers/cloudflare-config.mdx`.
- Cloudflare docs: `src/content/docs/cf/get-started/first-worker.mdx`.
- Installed `@cloudflare/vite-plugin` types for assets-only configuration.
- Chromium Linux trust documentation:
  https://github.com/chromium/chromium/blob/main/docs/linux/cert_management.md

The pinned CLI is cf 0.15.0. `cf init` is absent in that release despite newer docs
showing it; the typed configuration uses installed supported APIs and passes the real
build, deployment dry run, and actual deployment.
