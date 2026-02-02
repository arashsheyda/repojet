import { LocalStorage } from "@raycast/api";
import { ALIASES_STORAGE_KEY } from "../constants";
import type { RepoAlias } from "../types";

/**
 * Load all repository aliases from LocalStorage
 */
export async function loadAliases(): Promise<Map<number, RepoAlias>> {
  const stored = await LocalStorage.getItem<string>(ALIASES_STORAGE_KEY);
  const aliasMap = new Map<number, RepoAlias>();
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as RepoAlias[];
      parsed.forEach((alias) => {
        aliasMap.set(alias.repoId, alias);
      });
    } catch {
      // Invalid data, return empty map
    }
  }
  
  return aliasMap;
}

/**
 * Save all repository aliases to LocalStorage
 */
export async function saveAliases(aliases: Map<number, RepoAlias>): Promise<void> {
  const aliasArray = Array.from(aliases.values());
  await LocalStorage.setItem(ALIASES_STORAGE_KEY, JSON.stringify(aliasArray));
}

/**
 * Set or update an alias for a repository
 */
export async function setAlias(repoId: number, repoFullName: string, alias: string): Promise<void> {
  const aliases = await loadAliases();
  aliases.set(repoId, { repoId, repoFullName, alias: alias.trim() });
  await saveAliases(aliases);
}

/**
 * Remove an alias for a repository
 */
export async function removeAlias(repoId: number): Promise<void> {
  const aliases = await loadAliases();
  aliases.delete(repoId);
  await saveAliases(aliases);
}

/**
 * Get alias for a specific repository
 */
export async function getAlias(repoId: number): Promise<string | undefined> {
  const aliases = await loadAliases();
  return aliases.get(repoId)?.alias;
}

/**
 * Check if a search query matches any alias and return matching repo IDs
 */
export function getMatchingReposByAlias(
  searchQuery: string,
  aliases: Map<number, RepoAlias>
): Set<number> {
  const matchingIds = new Set<number>();
  const query = searchQuery.toLowerCase().trim();
  
  if (!query) return matchingIds;
  
  for (const [repoId, aliasData] of aliases.entries()) {
    if (aliasData.alias.toLowerCase().includes(query)) {
      matchingIds.add(repoId);
    }
  }
  
  return matchingIds;
}
