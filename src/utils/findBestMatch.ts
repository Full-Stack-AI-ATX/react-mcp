// AIDEV-NOTE: This file contains a Levenshtein distance implementation
// to provide fuzzy string matching for things like table names.

/**
 * Calculates the Levenshtein distance between two strings.
 * @param a The first string.
 * @param b The second string.
 * @returns The Levenshtein distance.
 */
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) {
    return bn;
  }
  if (bn === 0) {
    return an;
  }
  const matrix = new Array(bn + 1);
  for (let i = 0; i <= bn; ++i) {
    matrix[i] = new Array(an + 1);
  }
  for (let i = 0; i <= an; ++i) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= bn; ++j) {
    matrix[j][0] = j;
  }
  for (let j = 1; j <= bn; ++j) {
    for (let i = 1; i <= an; ++i) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  return matrix[bn][an];
}

/**
 * Finds the best match for a given query string from a list of candidates.
 * @param query The string to match.
 * @param candidates A list of strings to match against.
 * @param threshold The maximum Levenshtein distance to consider a match (lower is better).
 * @returns The best matching string from the candidates, or null if no match is found within the threshold.
 */
export function findBestMatch(
  query: string,
  candidates: string[],
  threshold = 2
): string | null {
  let bestMatch: string | null = null;
  let minDistance = Infinity;

  if (!candidates || candidates.length === 0) {
    console.log('[findBestMatch] No candidates provided.');
    return null;
  }

  for (const candidate of candidates) {
    const distance = levenshtein(query.toLowerCase(), candidate.toLowerCase());
    console.log(`[findBestMatch] Comparing "${query}" with "${candidate}", distance: ${distance}`);
    if (distance < minDistance && distance <= threshold) {
      minDistance = distance;
      bestMatch = candidate;
    }
  }

  console.log(`[findBestMatch] Best match for "${query}" is "${bestMatch}" with distance ${minDistance}.`);
  return bestMatch;
}
