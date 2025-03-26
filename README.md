# Repository Badges
[![Current Version](https://raw.githubusercontent.com/thewerthon/RepoBadges/badges/version.svg)](../../releases)
[![Last Updated](https://raw.githubusercontent.com/thewerthon/RepoBadges/badges/updated.svg)](../../releases)
[![Total of Files](https://raw.githubusercontent.com/thewerthon/RepoBadges/badges/files.svg)](./README.md)
[![Lines of Code](https://raw.githubusercontent.com/thewerthon/RepoBadges/badges/lines.svg)](./README.md)

Generate badges for:

- Current Version (based on the latest tag)
- Last Updated timestamp (based on the latest tag)
- Total of Files in repository
- Lines of Code in Repository

## How to Use:
Setup this action on your repository:

```yml
name: Badges

on:
  push:
    branches:
      - main
  release:
    types:
      - published

jobs:
  create_badges:
    runs-on: ubuntu-latest
    name: Create Badges
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v1
        
      - name: Generate Badges
        uses: thewerthon/RepoBadges@v1.0.1
        id: badges
        with:
          directory: ./
          patterns: "**"
          ignore: "node_modules"
          version_prefix: "v"
          version_fallback: "v0.0.0"
          version_badge: ./output/version.svg
          updated_badge: ./output/updated.svg
          files_badge: ./output/files.svg
          lines_badge: ./output/lines.svg
          version_badge_label: "Current Version"
          updated_badge_label: "Last Updated"
          files_badge_label: "Main Files"
          lines_badge_label: "Code Lines"
          version_badge_style: "classic"
          updated_badge_style: "classic"
          files_badge_style: "classic"
          lines_badge_style: "classic"
          version_badge_color: "green"
          updated_badge_color: "blue"
          files_badge_color: "blue"
          lines_badge_color: "blue"

      - name: Deploy to Branch
        uses: peaceiris/actions-gh-pages@v3
        with:
          publish_dir: ./output
          publish_branch: badges
          github_token: ${{ secrets.GITHUB_TOKEN }}
          user_name: 'github-actions[bot]'
          user_email: 'github-actions[bot]@users.noreply.github.com'
```

The badges will be generated `version.svg`, `updated.svg`, `files.svg` and `lines.svg`.<br>
They will be pushed to another branch `badges` on the repository.

Make sure workflows have read and write permissions in Repository Settings > Actions > General:

![image](https://github.com/thewerthon/RepoBadges/assets/54153146/ea0c2db2-5187-4b36-937a-5685590ce165)

The output badges can be customized.<br>
[Check out the options here.](./action.yml)
