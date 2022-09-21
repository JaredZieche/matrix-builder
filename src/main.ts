import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import * as fs from "fs";
import * as glob from "@actions/glob";
import * as path from "path";

async function run(): Promise<void> {
  try {
    // Create GitHub client with the API token.
    const token = core.getInput("token", { required: true });
    const octokit = getOctokit(token);
    const configpath = core.getInput("config_path", { required: true });
    const filetype = core.getInput("file_type", { required: true });
    const mapfile = core.getInput("map_file", { required: true });

    // Debug log the payload.
    core.debug(`Payload keys: ${Object.keys(context.payload)}`);

    // Get event name.
    const eventName = context.eventName;

    // Define the base and head commits to be extracted from the payload.
    let base: string | undefined;
    let head: string | undefined;

    switch (eventName) {
      case "pull_request":
        base = context.payload.pull_request?.base?.sha;
        head = context.payload.pull_request?.head?.sha;
        break;
      case "push":
        base = context.payload.before;
        head = context.payload.after;
        break;
      default:
        core.setFailed(
          `This action only supports pull requests and pushes, ${context.eventName} events are not supported. ` +
            "Please submit an issue on this action's GitHub repo if you believe this in correct."
        );
    }

    // Log the base and head commits
    core.info(`Base commit: ${base}`);
    core.info(`Head commit: ${head}`);

    // Ensure that the base and head properties are set on the payload.
    if (!base || !head) {
      core.setFailed(
        `The base and head commits are missing from the payload for this ${context.eventName} event. ` +
          "Please submit an issue on this action's GitHub repo."
      );

      // To satisfy TypeScript, even though this is unreachable.
      base = "";
      head = "";
    }

    // Use GitHub's compare two commits API.
    // https://developer.github.com/v3/repos/commits/#compare-two-commits
    const response = await octokit.rest.repos.compareCommitsWithBasehead({
      basehead: `${base}...${head}`,
      owner: context.repo.owner,
      repo: context.repo.repo
    });
    // const response = await octokit.rest.repos.compareCommits({
    //   base,
    //   head,
    //   owner: context.repo.owner,
    //   repo: context.repo.repo
    // });

    // Ensure that the request was successful.
    if (response.status !== 200) {
      core.setFailed(
        `The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${response.status}, expected 200. ` +
          "Please submit an issue on this action's GitHub repo."
      );
    }

    // Ensure that the head commit is ahead of the base commit.
    if (response.data.status !== "ahead") {
      core.setFailed(
        `The head commit for this ${context.eventName} event is not ahead of the base commit. ` +
          "Please submit an issue on this action's GitHub repo."
      );
    }

    // Get the changed files from the response payload.
    const commitfiles = response.data.files;
    const contextdirs = [] as string[];
    for (const file of commitfiles) {
      const filename = file.filename;
      if (filename.match(`/${configpath}/`)) {
        let dirname = path.dirname(filename);
        contextdirs.push(`${dirname}/${filetype}`);
      }
    }

    console.log(contextdirs)
    const newdirs = [] as string[];
    let globPattern = [...new Set(contextdirs)];
    const globber = await glob.create(globPattern.join("\n"));
    const globs = await globber.glob();
    for (const glob of globs) {
      let newdir = path.dirname(glob);
      newdirs.push(newdir);
    }

    console.log(newdirs)
    type matrices = { name?: string; env?: string; image?: string };
    type include = matrices[];
    const matrix: Object = {};

    for (const dir of newdirs) {
      console.log(dir);
      const configFile = `${dir}/config.json`;
      const config = fs.readFileSync(configFile, "utf8");
      let configobj = JSON.parse(config);
      const configmap = fs.readFileSync(mapfile, "utf8");
      let mapobj: Object = JSON.parse(configmap);
      console.log(configobj)
      console.log(mapobj)
      for (const target of configobj.targets) {
        for (let [key, value] of Object.entries(mapobj)) {
          for (const val of value) {
            if (val.includes(target)) {
              let gh = key;
              const include: include = [];
              include.push({
                name: dir,
                env: gh,
                image: `${configobj.image["name"]}:${configobj.image["tag"]}`
              });
            }
          }
        }
      }
    }

    console.log(matrix)
    core.info(`Initial Context directories: ${contextdirs}`);
    core.info(`Context directories: ${newdirs}`);
    core.info(`Matrix: ${matrix}`);

    core.setOutput("matrix", matrix);
    core.setOutput("contextdirs", contextdirs);
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`);
  }
}

run();
