<p align="center">
  <img src="./assets/banner.png" alt="Ruci Banner" width="480"/>
</p>

## Ruci: Empowering Enterprise Angular with Robust ngx-translate Assurance

**Ruci** is a powerful **Command Line Interface (CLI) tool** meticulously crafted to streamline the **internationalization (i18n) validation process** for your **Angular projects** utilizing **ngx-translate**. Ruci empowers developers to maintain high-quality translation files, ensuring a consistent and error-free user experience across all languages.

## Table of Contents

- [Installation](#installation)
- [General Usage](#general-usage)
- [Options](#options)
- [Commands](#commands)
- [Examples](#examples)
  - [Initializing Configuration](#initializing-configuration)
  - [Running Checks](#running-checks)

## Installation

Using **bun**:

```bash
bun add --dev ruci
```

Using **npm**:

```bash
npm install --save-dev ruci
```

Using **yarn**:

```bash
yarn add --dev ruci
```

After installation, `ruci` can be accessed via a command in your `package.json` file or directly in the CLI.

Update your `package.json` and add a new command:

```bash
"scripts": {
    // ...other commands,
    "ruci": "ruci"
}
```

Now you can run the `ruci` command directly from the command-line, i.e. `bun ruci`.

Alternatively you can also access the library directly:

```bash
node_modules/.bin/ruci
```

## General Usage

To use `ruci`, you typically run it from your project's root directory. It will load configuration from `ruci.config.json` if present, or you can provide options directly via the CLI.

Example:

```bash
npx ruci
```

## Options

`ruci` provides several options to customize its behavior. These options can be set via the command line or configured in `ruci.config.json`.

### --base-language-path <path>

Path to the base language file (e.g., `src/assets/i18n/en.json`). This file serves as the reference for all checks.

### --language-paths <paths...>

Paths to other language files or glob patterns (e.g., `src/assets/i18n/es.json`, `src/assets/i18n/fr.json`). Multiple paths can be provided.

### --project-files <files...>

Paths to project files or glob patterns where translation keys are used (e.g., `src/app/**/*.ts`, `src/app/**/*.html`). Multiple paths can be provided.

### --missing-keys <level>

Find missing keys in translation files. Available levels: `warn`, `error`, `skip`.

### --unused-keys <level>

Find unused keys in translation files. Available levels: `warn`, `error`, `skip`.

### --duplicate-values <level>

Find duplicate values across translation files. Available levels: `warn`, `error`, `skip`.

### --verify-project-keys <level>

Verify translation keys used in project files exist in translation files. Available levels: `warn`, `error`, `skip`.

## Commands

### init

Initializes a `ruci.config.json` file in the current directory with a default configuration. This command is useful for quickly setting up `ruci` in a new project.

```bash
npx ruci init
```

## Examples

### Initializing Configuration

To create a default `ruci.config.json` file:

```bash
npx ruci init
```

This will create a file similar to this:

```json
{
  "baseLanguagePath": "src/assets/i18n/en.json",
  "languagePaths": [
    "src/assets/i18n/es.json",
    "src/assets/i18n/fr.json"
  ],
  "projectFiles": [
    "src/app/**/*.ts",
    "src/app/**/*.html"
  ],
  "options": {
    "missingKeys": "skip",
    "unusedKeys": "skip",
    "duplicateValues": "skip",
    "verifyProjectKeys": "skip"
  }
}
```

### Running Checks

To run `ruci` with the configuration defined in `ruci.config.json`:

```bash
npx ruci
```

To run specific checks via CLI options:

```bash
npx ruci \
--base-language-path src/assets/i18n/id.json \
--language-paths src/assets/i18n/en.json src/assets/i18n/it.json \
--project-files "src/app/**/*.ts" "src/app/**/*.html" \
--missing-keys error \
--unused-keys error \
--duplicate-values error \
--verify-project-keys warn
```