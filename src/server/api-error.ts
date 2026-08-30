export type ApiErrorShape = {
  code: string;
  message: string;
  details?: string;
};

/**
 * Plain-data shape for the `error` field embedded in a JSON body — NOT an HTTP response itself.
 * Callers still pick their own status via `NextResponse.json({ message, error: apiError(...) }, { status })`.
 */
export function apiError(input: {
  code: string | number;
  message: string;
  details?: string;
}): ApiErrorShape {
  return {
    code: String(input.code),
    message: input.message,
    details: input.details,
  };
}
