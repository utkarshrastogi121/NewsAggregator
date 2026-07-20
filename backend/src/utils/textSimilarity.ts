/**
 * Generates character bigrams (pairs of adjacent characters) from a given string.
 */
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  const normalized = str.toLowerCase().replace(/\s+/g, '');
  
  for (let i = 0; i < normalized.length - 1; i++) {
    bigrams.add(normalized.substring(i, i + 2));
  }
  
  return bigrams;
}

/**
 * Calculates the similarity ratio between two strings using Dice's Coefficient.
 * Returns a score between 0.0 (completely different) and 1.0 (exact match).
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim();
  const s2 = str2.trim();

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);

  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersection++;
    }
  }

  return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
}