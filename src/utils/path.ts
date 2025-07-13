import * as fs from "node:fs";
import * as path from "node:path";

import { glob } from "glob";

import type { JSONReaderOptions } from "@/types/json";

export function findProjectPath(
  startPath: string = process.cwd(),
): string | null {
  let currentPath = path.resolve(startPath);
  const rootPath = path.parse(currentPath).root;

  while (currentPath !== rootPath) {
    if (fs.existsSync(path.join(currentPath, "package.json"))) {
      return currentPath;
    }

    if (fs.existsSync(path.join(currentPath, "angular.json"))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
}

export async function findFilesByPattern(
  options: Pick<JSONReaderOptions, "baseDir" | "pattern">,
): Promise<string[]> {
  const searchPath = path.resolve(options.baseDir, options.pattern);
  const files = await glob(searchPath);
  return files;
}
