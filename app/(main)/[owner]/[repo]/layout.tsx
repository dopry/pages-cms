import { redirect} from "next/navigation";
import { Octokit } from "octokit";
import { getAuth } from "@/lib/auth";
import { getUserToken } from "@/lib/token";
import { RepoProvider } from "@/contexts/repo-context";
import { Message } from "@/components/message";
import { Repo } from "@/types/repo";

export default async function Layout({
  children,
  params: { owner, repo }
}: {
  children: React.ReactNode;
  params: { owner: string; repo: string; };
}) {
  const { session, user } = await getAuth();
  if (!session) return redirect("/sign-in");

  const token = await getUserToken();
  if (!token) throw new Error("Token not found");

  try {
    const octokit = new Octokit({ auth: token });
    const repoResponse = await octokit.rest.repos.get({ owner: owner, repo: repo });
    
    let branches = [];
    let hasMore = true;
    let page = 1;

    while (hasMore) {
      const branchesResponse = await octokit.rest.repos.listBranches({ owner, repo, page: page, per_page: 100 });
      if (branchesResponse.data.length === 0) break;
      branches.push(...branchesResponse.data);
      hasMore = (branchesResponse.data.length === 100);
      page++;
    }

    const branchNames = branches.map(branch => branch.name);
    
    if (branchNames.length === 0) {
      return(
        <Message
          title="This repository is empty."
          description={`You need to create a branch and add a ".pages.yml" file to configure it.`}
          className="absolute inset-0"
          cta="Select another repository"
          href="/"
        />
      );
    }

    const repoInfo: Repo = {
      owner: repoResponse.data.owner.login,
      repo: repoResponse.data.name,
      defaultBranch: repoResponse.data.default_branch,
      branches: branchNames,
      isPrivate: repoResponse.data.private
    };

    return (
      <RepoProvider repo={repoInfo}>
        {children}
      </RepoProvider>
    );
  } catch (error: any) {
    switch (error.status) {
      case 404:
        return(
          <Message
            title="This repository doesn't exist."
            description={<>It may have been removed, renamed or the path may be wrong.</>}
            className="absolute inset-0"
            cta="Select another repository"
            href="/"
          />
        ); 
      case 403:
        return(
          <Message
            title="You can't access this repository."
            description={<>You do not have the sufficient permissions to access this repository.</>}
            className="absolute inset-0"
            cta="Select another repository"
            href="/"
          />
        ); 
      default:
        throw error;
    }
  }
}