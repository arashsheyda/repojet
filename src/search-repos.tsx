import { List, Detail, getPreferenceValues } from '@raycast/api'
import { useEffect, useState } from 'react'

import type { PreferencesState } from './types'
import { checkTokenScopes, useGithubRepos } from './api/github'
import RepositoryListItem from './components/RepositoryListItem'

export default function SearchRepositories() {
  const [searchText, setSearchText] = useState('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  const preferences = getPreferenceValues<PreferencesState>()

  const orgs = preferences.organizations
    .split(',')
    .map((org) => org.trim())
    .filter(Boolean)

  // Check token validity on mount
  useEffect(() => {
    async function validateToken() {
      if (!preferences.githubToken) {
        setTokenValid(false)
        return
      }
      const { valid } = await checkTokenScopes(preferences.githubToken)
      setTokenValid(valid)
    }
    validateToken()
  }, [preferences.githubToken])

  const { repositories, isLoading } = useGithubRepos(searchText, preferences)

  // TODO: move to components
  if (!preferences.githubToken || orgs.length === 0) {
    return (
      <Detail
        markdown={`# GitHub Organization Search

Configure the extension to get started:

1. **Add GitHub Token**: Go to [GitHub Settings](https://github.com/settings/tokens) and create a Personal Access Token with \`repo\` scope.
2. **Add Organizations**: Enter the organization names you want to search (comma-separated).

Once configured, you can search repositories across your organizations.`}
      />
    )
  }

  if (tokenValid === false) {
    return (
      <Detail
        markdown={`# Invalid or Unsafe Token

⚠️ Your GitHub token has write or admin permissions that this extension does not need.  
For security reasons, please create a new **read-only token** with only the \`repo\` scope.`}
      />
    )
  }

  if (tokenValid === null) {
    return <List isLoading={true} searchBarPlaceholder="Validating token..." />
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search repositories..."
      throttle
    >
      {repositories.length === 0 && !isLoading ? (
        <List.EmptyView title="No repositories found" />
      ) : (
        repositories.map((repo) => <RepositoryListItem key={repo.id} repo={repo} />)
      )}
    </List>
  )
}
