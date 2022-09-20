import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import * as fs from "fs";
import * as glob from "@actions/glob";
import * as path from "path"

async function run(): Promise<void> {
  try {
    // Create GitHub client with the API token.
    const token = core.getInput("token", { required: true });
    const octokit = getOctokit(token);
    const configpath = core.getInput("config_path", { required: true })
    const fileType = core.getInput("file_type", { required: true })

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
      owner: 'jaredzieche',
      repo: 'github-actions-testing'
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
      const filename = file.filename
      if (filename.match(`/${configpath}/`)) {
        let dirname = path.dirname(filename)
        contextdirs.push(`${dirname}/${fileType}`);
      }
    }
    core.setOutput("contextdirs", contextdirs);
    const newdirs = [];
    let globPattern = [...new Set(contextdirs)]
    const globber = await glob.create(globPattern.join('\n'))
    const globs = await globber.glob()
    for (const glob of globs) {
      let newdir = path.dirname(glob)
      newdirs.push(newdir);
    }
    core.info(`Context directories: ${newdirs}`)
    // // console.log(newdirs)
    // const buildMatrix = {};
    // const promotionMatrix = {};
    // buildMatrix.include = []
    // promotionMatrix.include = []
    // for (const dir of newdirs) {
    //   console.log(dir)
    //   const configFile = `${dir}/config.json`
    //   // console.log(configFile)
    //   const config = fs.readFileSync(configFile, 'utf8')
    //   // console.log(config)
    //   let obj = JSON.parse(config)
    //   const mapFile = fs.readFileSync('/Users/jaredzieche/github-actions-testing/src/docker/config.json', 'utf8')
    //   const registryMap = JSON.parse(mapFile)
    //   for (const target of obj.targets) {
    //     var ghEnv = Object.entries(registryMap)
    //     // console.log(ghEnv)
    //     for (const [key,value] of Object.entries(registryMap)) {
    //       for (var t of value) {
    //         if (t.includes(target)) {
    //           let gh = key
    //           // console.log(key)
    //           buildMatrix.include.push({
    //             name: dir,
    //             image: `${obj.image["name"]}:${obj.image["tag"]}`
    //           })
    //           promotionMatrix.include.push({
    //             name: dir,
    //             env: gh,
    //             targets: target,
    //             image: `${obj.image["name"]}:${obj.image["tag"]}`
    //           })
    //         }
    //       }
    //     }
    //   }
    // }
    // console.log(buildMatrix)
    // console.log(promotionMatrix)
    // const buildMatrixYaml = yaml.dump(buildMatrix)
    // console.log(buildMatrixYaml)


  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`);
  }
}

run();
