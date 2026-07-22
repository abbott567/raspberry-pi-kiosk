# Contributing to Raspberry Pi — Kiosk Mode

Thanks for your interest in contributing! This project is a collection of scripts and a step-by-step guide for turning a Raspberry Pi into a stand-alone kiosk, so contributions are usually one of three things: fixes to the scripts, improvements to the README guide, or reports of hardware and OS combinations that behave differently.

## Reporting bugs

Before opening an issue, check the [existing issues](https://github.com/abbott567/raspberry-pi-kiosk/issues) to see if it has already been reported.

When you open a bug report, please include:

- Which Raspberry Pi model you are using, for example, Pi 4 or Pi 5
- Which OS version you are running, for example, Raspberry Pi OS Bookworm
- Which display you are using
- The step in the guide where things went wrong
- Any error messages or logs, for example, output from `journalctl` or the script that failed

## Suggesting improvements

Suggestions are welcome, especially for making the guide clearer or supporting more hardware. Open an issue describing what you would like to change and why before starting on a large piece of work, so we can agree on the approach first.

## Making changes

1. Fork the repository and create a branch from `main`
2. Make your changes
3. If you change a script, test it on a real Raspberry Pi where possible, and say in the pull request which model and OS version you tested on
4. If you change the guide, check the table of contents and step numbers still line up
5. Update `CHANGELOG.md` with a short description of your change
6. Open a pull request describing what you changed and why

## Style

- Shell scripts should pass [ShellCheck](https://www.shellcheck.net/) where practical
- Keep the README in the same tone as the rest of the guide: plain English, numbered steps, and a note or warning callout where something is easy to get wrong

## Code of conduct

This project has a [code of conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold it.

## Licence

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
