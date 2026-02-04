/**
 * Application configuration constants
 */

/** Maximum number of repositories to keep in recent history */
export const MAX_RECENT_REPOS = 10;

/** Maximum number of repositories to fetch per API request */
export const API_PAGE_SIZE = 30;

/** GitHub API dangerous scopes that should be rejected */
export const DANGEROUS_SCOPES = [
  "delete_repo",
  "workflow",
  "admin:org",
  "write:repo_hook",
] as const;

/** Default clone directory */
export const DEFAULT_CLONE_DIR = "~/Developer";

/** Storage keys for LocalStorage */
export const STORAGE_KEYS = {
  BOOKMARKED_REPOS: "bookmarked-repos",
  RECENT_REPOS: "recent-repos",
  ALIASES: "repo-aliases",
} as const;
