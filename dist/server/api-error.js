/**
 * Plain-data shape for the `error` field embedded in a JSON body — NOT an HTTP response itself.
 * Callers still pick their own status via `NextResponse.json({ message, error: apiError(...) }, { status })`.
 */
export function apiError(input) {
    return {
        code: String(input.code),
        message: input.message,
        details: input.details,
    };
}
//# sourceMappingURL=api-error.js.map