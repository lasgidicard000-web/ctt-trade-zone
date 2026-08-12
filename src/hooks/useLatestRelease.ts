import { useQuery } from "@tanstack/react-query";
import { githubRepo, latestReleaseApiUrl } from "@/config/appStores";
import type { GitHubRelease } from "@/lib/releaseAssets";

export type ReleaseStatus =
  | "not-configured"
  | "loading"
  | "no-release"
  | "error"
  | "ready";

export const useLatestRelease = () => {
  const configured = githubRepo.length > 0;

  const query = useQuery<GitHubRelease | null>({
    queryKey: ["github-latest-release", githubRepo],
    enabled: configured,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await fetch(latestReleaseApiUrl, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (response.status === 404) return null; // no release yet (or private repo)
      if (!response.ok) {
        throw new Error(`GitHub request failed (${response.status})`);
      }
      return (await response.json()) as GitHubRelease;
    },
  });

  let status: ReleaseStatus = "ready";
  if (!configured) status = "not-configured";
  else if (query.isLoading) status = "loading";
  else if (query.isError) status = "error";
  else if (!query.data) status = "no-release";

  return {
    status,
    release: query.data ?? null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
};
