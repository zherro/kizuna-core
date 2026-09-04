# AI

> **Status:** there is no AI module in the core today. The one live consumer (foco-total's Gemini
> marketplace-description generator) is domain-specific and stays in the consuming project. This
> doc captures the *pattern* to reuse when adding AI features, so a new one is built the same way.

## Pattern

- **No vendor SDK.** Raw `fetch` against the provider's REST endpoint, API key in the URL query
  param or a header.
- **Structured input → prompt → parse text → typed result.** Each feature is one builder
  function in `src/lib/server/ai/` plus one API route that calls it.
- **Always a template fallback.** When the provider is disabled, over quota, or errors, return a
  locally generated result and mark it: `{ ..., provider: 'template' }` vs `provider: '<vendor>'`.

```ts
const result = await generateSomething(input);
// { text: string, provider: 'gemini' | 'template', model: string }
```

## Env (Gemini example)

| Var | Default | Notes |
|---|---|---|
| `AI_PROVIDER` | `gemini` | only gemini wired today |
| `GEMINI_MODEL` | `gemini-2.0-flash` | |
| `GEMINI_API_KEY` | — | required for real calls |
| `AI_FALLBACK_TO_TEMPLATE` | `false` | force the template path |

All optional — with no key the feature falls back to its template.
