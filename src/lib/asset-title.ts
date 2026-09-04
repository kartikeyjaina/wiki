const extensionPattern = /\.[^./\\]+$/;
const numericOnlyPattern = /^\d+$/;
const resolutionPattern = /^\d{2,5}x\d{2,5}$/i;
const datePattern = /^(?:19|20)\d{2}$/;

export function cleanAssetTitle(filename: string): string {
  const basename = filename.trim().replace(extensionPattern, "");
  const normalized = basename.replace(/\d{2,5}x\d{2,5}/gi, " ").replace(/[._-]+/g, " ");
  const words = normalized.split(/\s+/).filter(Boolean);
  const cleaned: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const next = words[index + 1];
    if (numericOnlyPattern.test(word) || resolutionPattern.test(word)) continue;
    if (datePattern.test(word) && next && numericOnlyPattern.test(next) && next.length <= 2) {
      index += 1;
      continue;
    }
    if (numericOnlyPattern.test(word) && word.length <= 3) continue;
    cleaned.push(word);
  }

  const title = cleaned.join(" ").trim();
  if (!title) return basename || "Untitled asset";
  return title.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
