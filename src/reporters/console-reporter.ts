import chalk from "chalk";

import type {
  DuplicateValuesResult,
  MissingKeysResult,
  UnusedKeysResult,
  VerifyProjectKeysResult,
} from "@/types/translation";

const SEPARATOR = chalk.bold.white("-".repeat(60));

export function reportMissingKeys(results: MissingKeysResult[]): void {
  if (results.length === 0) {
    return;
  }

  console.log(chalk.bold.red("\n\n🚨 Missing Keys Report"));
  console.log(SEPARATOR);

  for (const result of results) {
    if (result.filePath) {
      console.log(chalk.bold.white(`\n📄 File: ${result.filePath}`));
    }
    for (const missingKey of result.missingKeys) {
      console.log(chalk.red(`  - ${missingKey.key}`));
    }
  }
  console.log(`\n${SEPARATOR}`);
}

export function reportUnusedKeys(results: UnusedKeysResult[]): void {
  if (results.length === 0) {
    return;
  }

  console.log(chalk.bold.red("\n\n⚠️ Unused Keys Report"));
  console.log(SEPARATOR);

  for (const result of results) {
    console.log(chalk.bold.white(`\n📄 In file: ${result.filePath}`));
    for (const unusedKey of result.unusedKeys) {
      console.log(chalk.yellow(`  - ${unusedKey.key}`));
    }
  }
  console.log(`\n${SEPARATOR}`);
}

export function reportDuplicateValues(results: DuplicateValuesResult[]): void {
  if (results.length === 0) {
    return;
  }

  console.log(chalk.bold.red("\n\n⚠️ Duplicate Values Found"));
  console.log(SEPARATOR);

  for (const result of results) {
    const filePath = result.filePath.split("/").pop() ?? result.filePath;
    console.log(chalk.bold.white(`\n📄 In file: ${filePath}`));
    for (const duplicate of result.duplicates) {
      console.log(chalk.cyan(`\n  - Value: "${duplicate.value}"`));
      console.log(
        chalk.grey(
          `    Keys: [${duplicate.keys.map((k) => chalk.red(`"${k}"`)).join(", ")}]`,
        ),
      );
    }
  }

  console.log(`\n${SEPARATOR}`);
  console.log(chalk.bold.cyan("✨ Summary:"));

  for (const result of results) {
    const filePath = result.filePath.split("/").pop() ?? result.filePath;
    const duplicateKeysCount = result.duplicates.reduce(
      (acc, d) => acc + d.keys.length,
      0,
    );
    const duplicateValuesCount = result.duplicates.length;
    const totalKeys = result.totalKeys;
    const originalSourceKeys =
      totalKeys - (duplicateKeysCount - duplicateValuesCount);

    console.log(chalk.white(`\n📄 File: ${chalk.bold(filePath)}`));
    console.log(`  Current Total Keys:  ${chalk.blue(totalKeys)}`);
    console.log(`  Expected Total Keys: ${chalk.green(originalSourceKeys)}`);
    console.log(chalk.grey(SEPARATOR));
    console.log(chalk.bold("  Problem Areas:"));
    console.log(`     🔑 Duplicate Keys:   ${chalk.red(duplicateKeysCount)}`);
    console.log(
      `     🗣️  Duplicate Values: ${chalk.yellow(duplicateValuesCount)}`,
    );
  }
  console.log("");
}

export function reportVerifyProjectKeys(result: VerifyProjectKeysResult): void {
  const { missingInProject, unusedInBaseLanguage } = result;
  if (missingInProject.length === 0 && unusedInBaseLanguage.length === 0) {
    return;
  }

  console.log("\n");
  console.log(chalk.bold.white("✨ Project Keys Verification Report ✨"));
  console.log(SEPARATOR);
  console.log("");

  if (missingInProject.length > 0) {
    console.log(
      chalk.bold.yellow("⚠️  Missing in Project (From Base Language)"),
    );
    console.log(SEPARATOR);
    for (const missing of result.missingInProject) {
      console.log(chalk.yellow(`  - ${missing.key}`));
    }
    console.log("");
  }

  if (unusedInBaseLanguage.length > 0) {
    console.log(
      chalk.bold.red("🆘  Used in Project, Missing in Base Language"),
    );
    console.log(SEPARATOR);
    const maxKeyLength = unusedInBaseLanguage.reduce(
      (max, unused) => Math.max(max, unused.key.length),
      0,
    );

    for (const unused of result.unusedInBaseLanguage) {
      const location = `${unused.filePath}:${unused.lineNumber}`;
      const keyWithPadding = unused.key.padEnd(maxKeyLength + 2);
      console.log(chalk.red(`  - ${keyWithPadding} [${location}]`));
    }
    console.log("");
  }
}
