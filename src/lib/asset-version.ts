export function nextAssetVersion(versions: { version: string }[]) {
  const highest = versions.reduce((max, item) => {
    const value = Number.parseInt(item.version, 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return String(highest + 1);
}