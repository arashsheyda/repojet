import { List, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

import type { RepoAlias } from "./types";
import { checkTokenScopes, useGithubRepos } from "./api/github";
import RepositoryListItem from "./components/RepositoryListItem";
import ConfigurationRequired from "./components/ConfigurationRequired";
import InvalidToken from "./components/InvalidToken";
import EmptyScreen from "./components/EmptyScreen";
import {
  loadAliases,
  setAlias,
  removeAlias,
  getMatchingReposByAlias,
} from "./utils/aliases";

export default function SearchRepositories() {
  const [searchText, setSearchText] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenScopes, setTokenScopes] = useState<string[]>([]);
  const [bookmarkedRepos, setBookmarkedRepos] = useState<Set<number>>(
    new Set(),
  );
  const [aliases, setAliases] = useState<Map<number, RepoAlias>>(new Map());

  const preferences = getPreferenceValues<Preferences>();

  const orgs = preferences.organizations
    .split(",")
    .map((org) => org.trim())
    .filter(Boolean);

  // Load bookmarks from LocalStorage on mount
  useEffect(() => {
    async function loadBookmarks() {
      const stored = await LocalStorage.getItem<string>("bookmarked-repos");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as number[];
          setBookmarkedRepos(new Set(parsed));
        } catch {
          // Invalid data, ignore
        }
      }
    }
    loadBookmarks();
  }, []);

  // Load aliases from LocalStorage on mount
  useEffect(() => {
    async function loadRepoAliases() {
      const aliasMap = await loadAliases();
      setAliases(aliasMap);
    }
    loadRepoAliases();
  }, []);

  // Check token validity on mount
  useEffect(() => {
    async function validateToken() {
      if (!preferences.githubToken) {
        setTokenValid(false);
        return;
      }
      const { valid, scopes } = await checkTokenScopes(preferences.githubToken);
      setTokenValid(valid);
      setTokenScopes(scopes);
    }
    validateToken();
  }, [preferences.githubToken]);

  const { repositories, isLoading, error } = useGithubRepos(
    searchText,
    preferences,
    aliases,
  );

  const toggleBookmark = async (repoId: number) => {
    const newBookmarks = new Set(bookmarkedRepos);
    if (newBookmarks.has(repoId)) {
      newBookmarks.delete(repoId);
    } else {
      newBookmarks.add(repoId);
    }
    setBookmarkedRepos(newBookmarks);
    await LocalStorage.setItem(
      "bookmarked-repos",
      JSON.stringify(Array.from(newBookmarks)),
    );
  };

  const handleSetAlias = async (
    repoId: number,
    repoFullName: string,
    alias: string,
  ) => {
    await setAlias(repoId, repoFullName, alias);
    const updatedAliases = await loadAliases();
    setAliases(updatedAliases);
  };

  const handleRemoveAlias = async (repoId: number) => {
    await removeAlias(repoId);
    const updatedAliases = await loadAliases();
    setAliases(updatedAliases);
  };

  // Get repos that match by alias
  const aliasMatchedRepoIds = getMatchingReposByAlias(searchText, aliases);

  // Sort repositories: bookmarked ones first, then alias matches, then by stars
  const sortedRepositories = [...repositories].sort((a, b) => {
    const aBookmarked = bookmarkedRepos.has(a.id);
    const bBookmarked = bookmarkedRepos.has(b.id);
    const aAliasMatch = aliasMatchedRepoIds.has(a.id);
    const bAliasMatch = aliasMatchedRepoIds.has(b.id);

    // Bookmarked repos come first
    if (aBookmarked && !bBookmarked) return -1;
    if (!aBookmarked && bBookmarked) return 1;

    // Then alias matches (only if searching)
    if (searchText.trim() && aAliasMatch && !bAliasMatch) return -1;
    if (searchText.trim() && !aAliasMatch && bAliasMatch) return 1;

    return 0; // Keep original order (already sorted by stars from API)
  });

  if (!preferences.githubToken || orgs.length === 0) {
    return (
      <ConfigurationRequired
        missingToken={!preferences.githubToken}
        missingOrganizations={orgs.length === 0}
      />
    );
  }

  if (tokenValid === false) {
    return <InvalidToken scopes={tokenScopes} />;
  }

  if (tokenValid === null) {
    return <List isLoading={true} searchBarPlaceholder="Validating token..." />;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search repositories..."
      throttle
    >
      {sortedRepositories.length === 0 && !isLoading ? (
        <EmptyScreen error={error} hasSearchText={searchText.length > 0} />
      ) : (
        sortedRepositories.map((repo) => (
          <RepositoryListItem
            key={repo.id}
            repo={repo}
            isBookmarked={bookmarkedRepos.has(repo.id)}
            onToggleBookmark={toggleBookmark}
            cloneDirectory={preferences.cloneDirectory}
            alias={aliases.get(repo.id)?.alias}
            onSetAlias={handleSetAlias}
            onRemoveAlias={handleRemoveAlias}
          />
        ))
      )}
    </List>
  );
}
