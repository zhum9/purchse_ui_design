export function saveDraft(scope: string, values: Record<string, unknown>) {
  localStorage.setItem(`procurement-execution-center:draft:${scope}`, JSON.stringify({ values, savedAt: new Date().toISOString() }));
}
