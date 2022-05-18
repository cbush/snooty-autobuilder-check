# snooty-autobuilder-check

This is a GitHub Action that checks Snooty autobuilder for success.
This is unofficial, unsupported, undocumented, unspellhcekced. YMMV.

## Quick Setup

Check your repo Settings to ensure Actions are enabled:

<img width="420" alt="image" src="https://user-images.githubusercontent.com/20050130/169135846-c2dba5ae-53bf-41da-84fc-b356c63f2a64.png">

⚠️ If your repo is **private**, you **can't use Actions for free.**

You can probably cherry-pick this commit to add it to your repo: https://github.com/mongodb/docs-app-services/pull/14/commits/4f63bcc6bea6cfaed10234ca80082e34dd55d363

To do so, go into your repo and run the following:

```bash
git remote add docs-app-services mongodb/docs-app-services
git fetch docs-app-services 4f63bcc6bea6cfaed10234ca80082e34dd55d363
git cherry-pick 4f63bcc6bea6cfaed10234ca80082e34dd55d363
git remote remove docs-app-services
```

That's it! Enjoy!

## Usage in a GitHub Actions Workflow

This action assumes your repo uses snooty autobuilder, which is unlikely unless you work on MongoDB docs.

Create a workflow YAML file in your repo at /.github/workflows/check-autobuilder.yml:

```yaml
name: Check Autobuilder for Errors

on:
  pull_request:
    paths:
      - "source/**"

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cbush/snooty-autobuilder-check@main
```

For example: https://github.com/mongodb/docs-realm/blob/master/.github/workflows/check-autobuilder.yml

## Other Usage

You can run this script from a CI other than GitHub Actions. Clone this repo and in the clone directory, run:
 
```sh
npm install
npm run build
node . actor/owner/repo/branch
```

Leaving the slashes, replace `actor/owner/repo/branch` with the PR info:

- actor - the username of the user who pushed to the branch (github.actor)
- owner/repo - the org and repo name (github.event.pull_request.head.repo.full_name)
- branch - the branch name (github.head_ref)

### Examples

**Across forks:** user `someuser` opens a PR to merge the branch `somebranch` on the fork `github.com/someuser/somerepo` to the upstream repo `github.com/someorg/somerepo`:

```sh
node . someuser/someuser/somerepo/somebranch
```

**Not across forks:** user `someuser` opens a PR to merge the upstream branch `somebranch` to the upstream repo `github.com/someorg/somerepo`:

```sh
node . someuser/someorg/somerepo/somebranch
```

**Additional commits by other users:** user `someotheruser` adds a commit to the upstream branch `somebranch`, though the PR was opened by `someuser`:

```sh
node . someotheruser/someorg/somerepo/somebranch
```
