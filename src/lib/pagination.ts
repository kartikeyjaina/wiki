export const DEFAULT_PAGE_SIZE = 40;
export const MAX_PAGE_SIZE = 100;

export function clampPageSize(value: number | undefined, fallback = DEFAULT_PAGE_SIZE): number {
  const candidate = Number.isFinite(value) ? Math.floor(value as number) : fallback;
  return Math.max(1, Math.min(candidate, MAX_PAGE_SIZE));
}

export function pageRange(offset: number, size: number): { from: number; to: number } {
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeSize = clampPageSize(size);
  return { from: safeOffset, to: safeOffset + safeSize - 1 };
}

export function hasNextPage(received: number, requested: number): boolean {
  return received >= clampPageSize(requested);
}
