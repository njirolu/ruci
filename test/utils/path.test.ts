import { beforeEach, expect, mock, spyOn, test } from "bun:test";
import { findProjectPath } from "../../src/utils/path";

mock.module("node:fs", () => ({
  existsSync: mock(() => false),
}));

mock.module("node:path", () => ({
  resolve: mock((...paths: string[]) => paths.join("/").replace(/\\/g, "/")),
  join: mock((...paths: string[]) => paths.join("/").replace(/\\/g, "/")),
  dirname: mock((p: string) => p.substring(0, p.lastIndexOf("/")) || "/"),
  parse: mock((p: string) => ({
    root: "/",
    dir: p,
    base: "",
    ext: "",
    name: "",
  })),
}));

mock.module("glob", () => ({
  glob: mock(async () => []),
}));

import * as fs from "node:fs";
import * as path from "node:path";

beforeEach(() => {
  mock.restore();
});

test("findProjectPath: should find project root with package.json", () => {
  const startPath = "/home/user/my-project/src";
  const projectRoot = "/home/user/my-project";

  const resolveSpy = spyOn(path, "resolve").mockReturnValue(startPath);

  const existsSyncSpy = spyOn(fs, "existsSync").mockImplementation((p) => {
    return p === `${projectRoot}/package.json`;
  });

  const result = findProjectPath(startPath);

  expect(result).toBe(projectRoot);
  expect(existsSyncSpy).toHaveBeenCalledWith(`${projectRoot}/package.json`);
  resolveSpy.mockRestore();
});

test("findProjectPath: should find project root with angular.json", () => {
  const startPath = "/home/user/ng-app/components";
  const projectRoot = "/home/user/ng-app";

  spyOn(path, "resolve").mockReturnValue(startPath);
  spyOn(fs, "existsSync").mockImplementation((p) => {
    return p === `${projectRoot}/angular.json`;
  });

  const result = findProjectPath(startPath);

  expect(result).toBe(projectRoot);
  expect(fs.existsSync).toHaveBeenCalledWith(`${projectRoot}/angular.json`);
});

test("findProjectPath: should return null if no project file is found", () => {
  const startPath = "/home/user/no-project/src";

  spyOn(path, "resolve").mockReturnValue(startPath);

  const result = findProjectPath(startPath);

  expect(result).toBeNull();
});

test("findFilesByPattern: should find files matching a pattern", async () => {
  const expectedFiles = ["/app/src/file1.json", "/app/src/file2.json"];

  // Mock glob module to return expected files
  mock.module("glob", () => ({
    glob: mock(async () => expectedFiles),
  }));

  // Mock path.join to work correctly
  mock.module("node:path", () => ({
    resolve: mock((...paths: string[]) =>
      paths.join("/").replace(/\/\//g, "/"),
    ),
    join: mock((...paths: string[]) => paths.join("/").replace(/\/\//g, "/")),
    dirname: mock((p: string) => p.substring(0, p.lastIndexOf("/")) || "/"),
    parse: mock((p: string) => ({
      root: "/",
      dir: p,
      base: "",
      ext: "",
      name: "",
    })),
  }));

  // Import after mocking
  const { findFilesByPattern } = await import("../../src/utils/path");

  const options = {
    baseDir: "/app",
    pattern: "src/**/*.json",
  };
  const files = await findFilesByPattern(options);

  expect(files).toEqual(expectedFiles);
});

test("findFilesByPattern: should return an empty array if no files match", async () => {
  // Mock glob module to return empty array
  mock.module("glob", () => ({
    glob: mock(async () => []),
  }));

  // Mock path.join to work correctly
  mock.module("node:path", () => ({
    resolve: mock((...paths: string[]) =>
      paths.join("/").replace(/\/\//g, "/"),
    ),
    join: mock((...paths: string[]) => paths.join("/").replace(/\/\//g, "/")),
    dirname: mock((p: string) => p.substring(0, p.lastIndexOf("/")) || "/"),
    parse: mock((p: string) => ({
      root: "/",
      dir: p,
      base: "",
      ext: "",
      name: "",
    })),
  }));

  // Import after mocking
  const { findFilesByPattern } = await import("../../src/utils/path");

  const options = {
    baseDir: "/app",
    pattern: "nonexistent/**/*.json",
  };
  const files = await findFilesByPattern(options);

  expect(files).toEqual([]);
});
