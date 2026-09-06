/**
 * Server-side `postgrestResources` config for the `form_results` plugin table (captured answers).
 * Read/list mainly — writes go through the `fn_form_result_upsert` RPC (see
 * `components/forms/use-form-answers.ts`), never a direct POST/PATCH, because the singleton key
 * is composite `(domain, reference_id)` with no id known at capture time. `mapInput` is kept
 * minimal for the rare admin correction case.
 */
import type { PostgrestResourceConfig } from './forms';
export declare const FORM_RESULTS_RESOURCE: PostgrestResourceConfig;
export declare const resourceFormResults: Record<string, PostgrestResourceConfig>;
//# sourceMappingURL=form-results.d.ts.map