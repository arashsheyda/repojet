// Temporary script to clear recent repos - run this once and delete
import { LocalStorage } from "@raycast/api";

async function clearRecentRepos() {
  await LocalStorage.removeItem("recent-repos");
  console.log("Cleared recent repos data");
}

clearRecentRepos();
