import { type NextRequest } from "next/server";
import { Octokit } from "octokit";
import { getSchemaByName } from "@/lib/schema";
import { getConfig } from "@/lib/utils/config";
import { getFileExtension, normalizePath } from "@/lib/utils/file";
import { getUser } from "@/lib/utils/user";

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string, repo: string, branch: string, path: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name") || "";
    
    const normalizedPath = normalizePath(params.path);
    
    if (name) {
      const config = await getConfig(params.owner, params.repo, params.branch);
      if (!config) throw new Error(`Configuration not found for ${params.owner}/${params.repo}/${params.branch}.`);
      
      const schema = getSchemaByName(config.object, name);
      if (!schema) throw new Error(`Schema not found for ${name}.`);

      if (!normalizedPath.startsWith(schema.path)) throw new Error(`Invalid path "${params.path}" for ${schema.type} "${name}".`);

      if (getFileExtension(normalizedPath) !== schema.extension) throw new Error(`Invalid extension "${getFileExtension(normalizedPath)}" for ${schema.type} "${name}".`);
    } else if (normalizedPath !== ".pages.yml") {
      throw new Error("If no content entry name is provided, the path must be \".pages.yml\".");
    }
    
    const { token } = await getUser();
    const octokit = new Octokit({ auth: token });

    const response = await octokit.rest.repos.listCommits({
      owner: params.owner,
      repo: params.repo,
      path: decodeURIComponent(normalizedPath),
      sha: params.branch,
    });

    return Response.json({
      status: "success",
      data: response.data
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    });
  }
}