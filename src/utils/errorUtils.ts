/**
 * Safe error message converter.
 * Prevents React Minified Error #31 (Objects are not valid as a React child)
 * by guaranteeing a clean string output for any error object, Vercel error payload, or unexpected exception.
 */
export function safeErrorMessage(err: unknown, fallback: string = 'Произошла неизвестная ошибка'): string {
  if (err === null || err === undefined) {
    return fallback;
  }

  if (typeof err === 'string') {
    const trimmed = err.trim();
    return trimmed || fallback;
  }

  if (typeof err === 'number' || typeof err === 'boolean') {
    return String(err);
  }

  if (err instanceof Error) {
    return err.message || fallback;
  }

  if (typeof err === 'object') {
    const obj = err as Record<string, any>;

    // Case 1: { error: "text" } or { error: { message: "text", code: "NOT_FOUND" } }
    if (obj.error) {
      if (typeof obj.error === 'string') return obj.error;
      if (typeof obj.error === 'object') {
        if (typeof obj.error.message === 'string') return obj.error.message;
        if (typeof obj.error.code === 'string') return `Ошибка ${obj.error.code}`;
      }
    }

    // Case 2: { message: "text", code: "..." }
    if (typeof obj.message === 'string') {
      return obj.message;
    }

    // Case 3: { code: "NOT_FOUND" }
    if (typeof obj.code === 'string') {
      return `Ошибка: ${obj.code}`;
    }

    try {
      return JSON.stringify(err);
    } catch {
      return fallback;
    }
  }

  return String(err) || fallback;
}
