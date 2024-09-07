import { Octokit } from "octokit";
import { getAuth } from "@/lib/auth";
import { getUserToken } from "@/lib/token";

export async function POST(
  request: Request,
  { params }: { params: { owner: string, repo: string, branch: string } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getUserToken();
    if (!token) throw new Error("Token not found");

    const data: any = await request.json();
    if (!data.name) throw new Error(`"name" is required.`);

    const octokit = new Octokit({ auth: token });

    // Get the SHA of the branch we"re creating the new branch from
    const { data: refData } = await octokit.rest.git.getRef({
      owner: params.owner,
      repo: params.repo,
      ref: `heads/${params.branch}`,
    });
    const sha = refData.object.sha;

    // Create the new branch with the obtained SHA
    const response = await octokit.rest.git.createRef({
      owner: params.owner,
      repo: params.repo,
      ref: `refs/heads/${data.name}`,
      sha,
    });

    return Response.json({
      status: "success",
      message: `Branch "${data.name}" created successfully from"${params.branch}".`,
      data: response.data,
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    });
  }
}