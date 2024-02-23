# mdsCloudCli

Command line tool for interfacing with various mds services and utilities

## Project Status

https://github.com/orgs/MadDonkeySoftware/projects/1

## Getting Started

### Development

To set up the CLI for local development:
* `npm run prepublish:setup` -- rebuilds the CLI files
* `cd dist` -- Switch to the JS files of the CLI
* `npm link` -- sets up your terminal environment to be able to run `mds`

To remove the locally linked CLI:
* `npm unlink -g mds-cloud-cli` -- removes the link from your system

## Usage

### Manual Installation

*(You should add these instructions to your project's README)*

In **zsh**, you can write these:

```bash
echo '. <(./githubber --completion)' >> .zshrc
```

In **bash**, you should write:

```bash
./githubber --completion >> ~/githubber.completion.sh
echo 'source ~/githubber.completion.sh' >> .bash_profile
```

In **fish**, you can write:

```bash
echo 'githubber --completion-fish | source' >> ~/.config/fish/config.fish
```

That's all!

Now you have an autocompletion system for your CLI tool.