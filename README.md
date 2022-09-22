<!-- start title -->

# GitHub Action: matrix-builder

<!-- end title -->
<!-- start description -->

Get all changed files from event and create a json object for use as a job matrix

<!-- end description -->
<!-- start usage -->

```yaml
- uses: JaredZieche/matrix-builder@main
  with:
    # github token for api requests
    # Default: ${{github.token}}
    token: ""

    # path in repo to check for matrix configuration files, string in the form of repo
    # path
    # Default: test/.*
    config_path: ""

    # filename to identify a directory as a build context
    # Default: Dockerfile
    file_type: ""

    # path to json file containing map of github runners to target envs
    # Default: test/map.json
    map_file: ""
```

<!-- end usage -->
<!-- start inputs -->

| **Input**         | **Description**                                                                       | **Default**         | **Required** |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------- | ------------ |
| **`token`**       | github token for api requests                                                         | `${{github.token}}` | **true**     |
| **`config_path`** | path in repo to check for matrix configuration files, string in the form of repo path | `test/.*`           | **true**     |
| **`file_type`**   | filename to identify a directory as a build context                                   | `Dockerfile`        | **true**     |
| **`map_file`**    | path to json file containing map of github runners to target envs                     | `test/map.json`     | **true**     |

<!-- end inputs -->
<!-- start outputs -->

| \***\*Output\*\*** | \***\*Description\*\***                             | \***\*Default\*\*** | \***\*Required\*\*** |
| ------------------ | --------------------------------------------------- | ------------------- | -------------------- |
| `contextdirs`      | Array of all changed files                          | undefined           | undefined            |
| `build-matrix`     | json object for use in image build job matrices     | undefined           | undefined            |
| `promotion-matrix` | json object for use in image promotion job matrices | undefined           | undefined            |

<!-- end outputs -->
