export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      out[key] = value;
    }
  });
  return out as T;
}
