import * as core from "@actions/core"
import * as github from "@actions/github"
import * as fs from "fs"
import * as glob from "@actions/glob"
import * as path from "path"

type mapKey = string
type mapValue = []

async function run(): Promise<void> {
  try {
    // Create GitHub client with the API token.
    const token = core.getInput("token", { required: true })
    const octokit = github.getOctokit(token)
    const context = github.context
    const configpath = core.getInput("config_path", { required: true })
    const filetype = core.getInput("file_type", { required: true })
    const mapfile = core.getInput("map_file", { required: true })

    // Debug log the payload.

    // Get event name.
    const eventName = context.eventName

    // Define the base and head commits to be extracted from the payload.
    let base: string | undefined
    let head: string | undefined

    switch (eventName) {
      case "pull_request":
        base = context.payload.pull_request?.base?.sha
        head = context.payload.pull_request?.head?.sha
        break
      case "push":
        base = context.payload.before
        head = context.payload.after
        break
      default:
        core.setFailed(
          `This action only supports pull requests and pushes, ${context.eventName} events are not supported. ` +
            "Please submit an issue on this action's GitHub repo if you believe this in correct."
        )
    }

    // Log the base and head commits
    core.info(`Base commit: ${base}`)
    core.info(`Head commit: ${head}`)

    // Ensure that the base and head properties are set on the payload.
    if (!base || !head) {
      core.setFailed(
        `The base and head commits are missing from the payload for this ${context.eventName} event. ` +
          "Please submit an issue on this action's GitHub repo."
      )

      // To satisfy TypeScript, even though this is unreachable.
      base = ""
      head = ""
    }

    // Use GitHub's compare two commits API.
    // https://developer.github.com/v3/repos/commits/#compare-two-commits
    const response = await octokit.rest.repos.compareCommitsWithBasehead({
      basehead: `${base}...${head}`,
      owner: context.repo.owner,
      repo: context.repo.repo
    })

    // Ensure that the request was successful.
    if (response.status !== 200) {
      core.setFailed(
        `The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${response.status}, expected 200. ` +
          "Please submit an issue on this action's GitHub repo."
      )
    }

    // Ensure that the head commit is ahead of the base commit.
    if (response.data.status !== "ahead") {
      core.setFailed(
        `The head commit for this ${context.eventName} event is not ahead of the base commit. ` +
          "Please submit an issue on this action's GitHub repo."
      )
    }

    // Get the changed files from the response payload.
    const commitfiles = response.data.files
    const contextdirs = [] as string[]
    for (const file of commitfiles) {
      const filename = file.filename
      if (filename.match(`/${configpath}/`)) {
        const dirname = path.dirname(filename)
        contextdirs.push(`${dirname}/${filetype}`)
      }
    }

    // Set new directories for glob search
    const newdirs = [] as string[]
    const globPattern = [...new Set(contextdirs)]
    const globber = await glob.create(globPattern.join("\n"))
    const globs = await globber.glob()
    for (const globdir of globs) {
      const newdir = path.dirname(globdir)
      newdirs.push(newdir)
    }

    // Declare matrix objects
    const buildMatrix: any = {}
    buildMatrix.include = []

    const promotionMatrix: any = {}
    promotionMatrix.include = []

    // Construct matrices
    for (const dir of newdirs) {
      const configFile = `${dir}/config.json`
      const config = fs.readFileSync(configFile, "utf8")
      const configObj = JSON.parse(config)
      const configmap = fs.readFileSync(mapfile, "utf8")
      const mapObj: Map<mapKey, mapValue> = JSON.parse(configmap)
      buildMatrix.include.push({
        name: dir,
        image: `${configObj.image["name"]}:${configObj.image["tag"]}`
      })
      // Compare config targets to map key/value
      for (const target of configObj.targets) {
        for (const [key, value] of Object.entries(mapObj)) {
          for (const val of value) {
            if (val.includes(target)) {
              const ghEnv = key
              promotionMatrix.include.push({
                name: dir,
                env: ghEnv,
                targets: target,
                image: `${configObj.image["name"]}:${configObj.image["tag"]}`
              })
            }
          }
        }
      }
    }

    // set outputs
    core.setOutput("contextdirs", contextdirs)
    core.setOutput("build-matrix", buildMatrix)
    core.setOutput("promotion-matrix", promotionMatrix)

    // Write job summary
    const buildArray = buildMatrix.include
    const buildCells = []
    buildCells.push([
      { data: "Context", header: true },
      { data: "Image", header: true }
    ])
    for (const elements of buildArray) {
      buildCells.push([elements.name, elements.image])
    }

    await core.summary
      .addHeading("Build-Matrix")
      .addTable(buildCells)
      .write()

    const promotionArray = promotionMatrix.include
    const promotionCells = []
    promotionCells.push([
      { data: "Context", header: true },
      { data: "Env", header: true },
      { data: "Targets", header: true },
      { data: "Image", header: true }
    ])
    for (const elements of promotionArray) {
      promotionCells.push([
        elements.name,
        elements.env,
        elements.targets,
        elements.image
      ])
    }

    await core.summary
      .addHeading("Promotion-Matrix")
      .addTable(promotionCells)
      .write()
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`)
  }
}

run()
