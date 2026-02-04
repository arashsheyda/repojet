import {
  List,
  Action,
  ActionPanel,
  Icon,
  openExtensionPreferences,
  Image,
  Color,
  showToast,
  Toast,
  open,
  Form,
  useNavigation,
} from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { useState } from "react";
import type { RepositoryListItemProps } from "../types";

const execAsync = promisify(exec);

function SetAliasForm({
  repoId,
  repoFullName,
  currentAlias,
  onSetAlias,
}: {
  repoId: number;
  repoFullName: string;
  currentAlias?: string;
  onSetAlias: (repoId: number, repoFullName: string, alias: string) => void;
}) {
  const { pop } = useNavigation();
  const [alias, setAlias] = useState(currentAlias || "");

  const handleSubmit = async () => {
    if (alias.trim()) {
      onSetAlias(repoId, repoFullName, alias.trim());
      await showToast({
        style: Toast.Style.Success,
        title: "Alias set successfully",
        message: `"${alias.trim()}" → ${repoFullName}`,
      });
      pop();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Alias" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="alias"
        title="Alias"
        placeholder="e.g., gh"
        value={alias}
        onChange={setAlias}
        info={`Set a short alias for ${repoFullName}`}
      />
    </Form>
  );
}

export default function RepositoryListItem({
  repo,
  isBookmarked,
  onToggleBookmark,
  cloneDirectory,
  alias,
  onSetAlias,
  onRemoveAlias,
  onRepoOpened,
}: RepositoryListItemProps) {
  const handleClone = async () => {
    onRepoOpened?.(repo.id);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Cloning repository...",
    });

    try {
      // Use user's preference or default to ~/Developer
      const baseDir = cloneDirectory || "~/Developer";
      const cloneDir = baseDir.startsWith("~")
        ? join(homedir(), baseDir.slice(2))
        : baseDir;
      const repoPath = join(cloneDir, repo.name);

      // Clone the repository
      await execAsync(`git clone "${repo.clone_url}" "${repoPath}"`);

      toast.style = Toast.Style.Success;
      toast.title = "Repository cloned successfully";
      toast.message = `Cloned to ${repoPath}`;
      toast.primaryAction = {
        title: "Open in Finder",
        onAction: () => open(repoPath),
      };
      toast.secondaryAction = {
        title: "Open in Terminal",
        onAction: () => open(repoPath, "Terminal"),
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to clone repository";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };
  return (
    <List.Item
      key={repo.id}
      title={repo.name}
      subtitle={repo.description || repo.full_name}
      icon={{
        source: repo.owner.avatar_url,
        mask: Image.Mask.RoundedRectangle,
        tooltip: `@${repo.owner.login}`,
      }}
      accessories={
        [
          isBookmarked && {
            icon: { source: Icon.Star, tintColor: Color.Yellow },
            tooltip: "Bookmarked",
          },
          alias && {
            tag: { value: alias, color: Color.Purple },
            tooltip: `Alias: ${alias}`,
          },
          repo.language && { text: repo.language, tooltip: "Language" },
          {
            icon: Icon.Calendar,
            tooltip: `Last Updated: ${new Date(repo.updated_at).toLocaleString()}`,
          },
          {
            text: `${repo.stargazers_count}`,
            tooltip: "Stars",
            icon: Icon.Star,
          },
          repo.private
            ? {
                icon: { source: Icon.Lock, tintColor: Color.Blue },
                tooltip: "Private Repository",
              }
            : {
                icon: { source: Icon.LockUnlocked, tintColor: Color.Green },
                tooltip: "Public Repository",
              },
        ].filter(Boolean) as List.Item.Accessory[]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              url={repo.html_url}
              title="Open in Browser"
              onOpen={() => onRepoOpened?.(repo.id)}
            />
            <Action
              title="Clone Repository"
              icon={Icon.Download}
              onAction={handleClone}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action.CopyToClipboard content={repo.html_url} title="Copy URL" />
            <Action.CopyToClipboard
              content={repo.clone_url}
              title="Copy Clone URL"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
              icon={isBookmarked ? Icon.StarDisabled : Icon.Star}
              onAction={() => onToggleBookmark(repo.id)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
            <Action.Push
              title={alias ? "Edit Alias" : "Set Alias"}
              icon={Icon.Pencil}
              target={
                <SetAliasForm
                  repoId={repo.id}
                  repoFullName={repo.full_name}
                  currentAlias={alias}
                  onSetAlias={onSetAlias}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
            {alias && (
              <Action
                title="Remove Alias"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  onRemoveAlias(repo.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Alias removed",
                    message: `Removed alias "${alias}" from ${repo.full_name}`,
                  });
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Open Preferences"
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
