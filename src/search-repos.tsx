import { List, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

import type { RepoAlias, GithubRepository } from "./types";
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
  const [recentRepos, setRecentRepos] = useState<GithubRepository[]>([]);

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

  // Load recent repos from LocalStorage on mount
  useEffect(() => {
    async function loadRecentRepos() {
      const stored = await LocalStorage.getItem<string>("recent-repos");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as GithubRepository[];
          // Filter out repos with missing required data
          const validRepos = parsed.filter(
            (repo) => repo && repo.id && repo.owner && repo.owner.avatar_url,
          );
          setRecentRepos(validRepos);
        } catch {
          // Invalid data, ignore
        }
      }
    }
    loadRecentRepos();
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

  const trackRecentRepo = async (repoId: number) => {
    const repo =
      repositories.find((r) => r.id === repoId) ||
      recentRepos.find((r) => r.id === repoId);
    if (!repo) return;

    const updated = [repo, ...recentRepos.filter((r) => r.id !== repoId)].slice(
      0,
      10,
    ); // Keep only the last 10 opened repos

    setRecentRepos(updated);
    await LocalStorage.setItem("recent-repos", JSON.stringify(updated));
  };

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
      {!searchText.trim() && recentRepos.length > 0 && !isLoading && (
        <List.Section title="Recently Opened">
          {recentRepos
            .filter((repo) => repo && repo.owner)
            .map((repo) => (
              <RepositoryListItem
                key={repo.id}
                repo={repo}
                isBookmarked={bookmarkedRepos.has(repo.id)}
                onToggleBookmark={toggleBookmark}
                cloneDirectory={preferences.cloneDirectory}
                alias={aliases.get(repo.id)?.alias}
                onSetAlias={handleSetAlias}
                onRemoveAlias={handleRemoveAlias}
                onRepoOpened={trackRecentRepo}
              />
            ))}
        </List.Section>
      )}
      {sortedRepositories.length === 0 && !isLoading && searchText.trim() ? (
        <EmptyScreen error={error} hasSearchText={searchText.length > 0} />
      ) : (
        <List.Section
          title={searchText.trim() ? "Search Results" : "All Repositories"}
        >
          {sortedRepositories.map((repo) => (
            <RepositoryListItem
              key={repo.id}
              repo={repo}
              isBookmarked={bookmarkedRepos.has(repo.id)}
              onToggleBookmark={toggleBookmark}
              cloneDirectory={preferences.cloneDirectory}
              alias={aliases.get(repo.id)?.alias}
              onSetAlias={handleSetAlias}
              onRemoveAlias={handleRemoveAlias}
              onRepoOpened={trackRecentRepo}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
