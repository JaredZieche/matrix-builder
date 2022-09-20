import * as core from '@actions/core'
import {context, getOctokit} from '@actions/github'

process.on('unhandledRejection', handleError)
main().catch(handleError)

async function main(): Promise<void> {
    const token = core.getInput('token', {required: true});
    const github = getOctokit(token);
    const files = await github.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: Number(context.payload.pull_request?.number)
    });
    const filenames = files.data.values.name
    console.log(filenames);
}

function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}
