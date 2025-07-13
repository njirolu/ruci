import {
  test,
  expect,
  spyOn,
  describe,
  afterEach,
  beforeEach,
  mock,
} from "bun:test";
import * as fs from "node:fs/promises";
import * as jsonParser from "../../../src/parsers/json-parser";
import * as spinnerUtils from "../../../src/utils/spinner";
import { FileNotFoundError, FileSystemError } from "../../../src/core/errors";
import * as globModule from "glob";

import * as fileReaderModule from "../../../src/core/services/file-reader";

beforeEach(() => {
  mock.restore();
});

afterEach(() => {
  mock.restore();
});

describe("readTranslationFile", () => {
  let fsSpy: any;
  let jsonParserSpy: any;
  let startSpinnerSpy: any;
  let succeedSpinnerSpy: any;

  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    fsSpy?.mockRestore();
    jsonParserSpy?.mockRestore();
    startSpinnerSpy?.mockRestore();
    succeedSpinnerSpy?.mockRestore();
  });

  test("should read and parse a file successfully", async () => {
    const filePath = "/project/en/common.json";
    const baseDir = "/project";
    const fileContent = '{"hello": "world"}';
    const parsedData = { hello: "world" };

    fsSpy = spyOn(fs, "readFile").mockResolvedValue(fileContent as any);
    jsonParserSpy = spyOn(jsonParser, "parseJson").mockReturnValue(parsedData);

    const result = await fileReaderModule.readTranslationFile(
      filePath,
      baseDir,
    );

    expect(fsSpy).toHaveBeenCalledWith(filePath, "utf-8");
    expect(jsonParserSpy).toHaveBeenCalledWith(fileContent, filePath);
    expect(result).toEqual({
      path: "en/common.json",
      data: parsedData,
    });
  });

  test("should use spinner when a message is provided", async () => {
    fsSpy = spyOn(fs, "readFile").mockResolvedValue("{}" as any);
    jsonParserSpy = spyOn(jsonParser, "parseJson").mockReturnValue({});
    startSpinnerSpy = spyOn(spinnerUtils, "startSpinner").mockImplementation(
      () => {},
    );
    succeedSpinnerSpy = spyOn(
      spinnerUtils,
      "succeedSpinner",
    ).mockImplementation(() => {});

    const spinnerMessage = "Reading file...";
    await fileReaderModule.readTranslationFile(
      "/project/en/common.json",
      "/project",
      spinnerMessage,
    );

    expect(startSpinnerSpy).toHaveBeenCalledWith(spinnerMessage);
    expect(succeedSpinnerSpy).toHaveBeenCalledWith(spinnerMessage);
  });

  test("should throw FileSystemError when fs.readFile fails", async () => {
    const filePath = "/project/en/nonexistent.json";
    const originalError = new Error("ENOENT");
    fsSpy = spyOn(fs, "readFile").mockRejectedValue(originalError);

    const promise = fileReaderModule.readTranslationFile(filePath, "/project");

    await expect(promise).rejects.toThrow(FileSystemError);
    await expect(promise).rejects.toThrow(`Failed to read file: ${filePath}`);
  });
});

describe("readTranslationFiles", () => {
  let fsSpy: any;
  let jsonParserSpy: any;
  let startSpinnerSpy: any;
  let succeedSpinnerSpy: any;

  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    fsSpy?.mockRestore();
    jsonParserSpy?.mockRestore();
    startSpinnerSpy?.mockRestore();
    succeedSpinnerSpy?.mockRestore();
  });

  test("should read multiple files found by glob", async () => {
    const baseDir = "/project";
    const pattern = "en/**/*.json";

    const globSpy = spyOn(globModule, "glob").mockResolvedValue([
      "/project/en/common.json",
      "/project/en/errors.json",
    ]);
    fsSpy = spyOn(fs, "readFile").mockResolvedValue('{"key": "value"}' as any);
    jsonParserSpy = spyOn(jsonParser, "parseJson").mockReturnValue({
      key: "value",
    });
    startSpinnerSpy = spyOn(spinnerUtils, "startSpinner").mockImplementation(
      () => {},
    );
    succeedSpinnerSpy = spyOn(
      spinnerUtils,
      "succeedSpinner",
    ).mockImplementation(() => {});

    const results = await fileReaderModule.readTranslationFiles(
      baseDir,
      pattern,
    );

    expect(results).toHaveLength(2);
    expect(results[0]?.path).toBe("en/common.json");
    expect(globSpy).toHaveBeenCalledWith(pattern, {
      cwd: baseDir,
      absolute: true,
    });
  });

  test("should throw FileNotFoundError if glob finds no files", async () => {
    const baseDir = "/project";
    const pattern = "fr/**/*.json";

    spyOn(globModule, "glob").mockResolvedValue([]);

    await expect(
      fileReaderModule.readTranslationFiles(baseDir, pattern),
    ).rejects.toThrow(FileNotFoundError);
  });

  test("should handle JSON parsing errors gracefully", async () => {
    const baseDir = "/project";
    const pattern = "en/**/*.json";

    spyOn(globModule, "glob").mockResolvedValue(["/project/en/common.json"]);
    fsSpy = spyOn(fs, "readFile").mockResolvedValue(
      "invalid json content" as any,
    );
    startSpinnerSpy = spyOn(spinnerUtils, "startSpinner").mockImplementation(
      () => {},
    );
    succeedSpinnerSpy = spyOn(
      spinnerUtils,
      "succeedSpinner",
    ).mockImplementation(() => {});
    const jsonError = new Error("JSON parsing failed");
    jsonParserSpy = spyOn(jsonParser, "parseJson").mockImplementation(() => {
      throw jsonError;
    });

    const promise = fileReaderModule.readTranslationFiles(baseDir, pattern);
    await expect(promise).rejects.toThrow(FileSystemError);
    await expect(promise).rejects.toHaveProperty("cause", jsonError);
  });

  test("should handle file read errors with proper error propagation", async () => {
    const baseDir = "/project";
    const pattern = "en/**/*.json";
    const readError = new Error("File not found");
    spyOn(globModule, "glob").mockResolvedValue(["/project/en/common.json"]);
    fsSpy = spyOn(fs, "readFile").mockRejectedValue(readError);
    startSpinnerSpy = spyOn(spinnerUtils, "startSpinner").mockImplementation(
      () => {},
    );
    succeedSpinnerSpy = spyOn(
      spinnerUtils,
      "succeedSpinner",
    ).mockImplementation(() => {});

    const promise = fileReaderModule.readTranslationFiles(baseDir, pattern);
    await expect(promise).rejects.toThrow(FileSystemError);
    await expect(promise).rejects.toHaveProperty("cause", readError);
  });

  test("should handle empty file content", async () => {
    const baseDir = "/project";
    const pattern = "en/**/*.json";

    spyOn(globModule, "glob").mockResolvedValue([
      "/project/en/common.json",
      "/project/en/errors.json",
    ]);
    fsSpy = spyOn(fs, "readFile").mockResolvedValue("" as any);
    jsonParserSpy = spyOn(jsonParser, "parseJson").mockReturnValue({});
    startSpinnerSpy = spyOn(spinnerUtils, "startSpinner").mockImplementation(
      () => {},
    );
    succeedSpinnerSpy = spyOn(
      spinnerUtils,
      "succeedSpinner",
    ).mockImplementation(() => {});

    const results = await fileReaderModule.readTranslationFiles(
      baseDir,
      pattern,
    );
    expect(results).toHaveLength(2);
    expect(results[0]?.data).toEqual({});
    expect(results[1]?.data).toEqual({});
  });

  test("should handle glob errors gracefully", async () => {
    const baseDir = "/project";
    const pattern = "invalid[pattern";

    spyOn(globModule, "glob").mockRejectedValue(
      new Error("Glob pattern error"),
    );

    await expect(
      fileReaderModule.readTranslationFiles(baseDir, pattern),
    ).rejects.toThrow("Glob pattern error");
  });

  test("should handle very large file list", async () => {
    const baseDir = "/project";
    const pattern = "large/**/*.json";

    const largeFileList = Array.from(
      { length: 100 },
      (_, i) => `/project/file${i}.json`,
    );
    spyOn(globModule, "glob").mockResolvedValue(largeFileList);
    fsSpy = spyOn(fs, "readFile").mockResolvedValue('{"test": "data"}');
    jsonParserSpy = spyOn(jsonParser, "parseJson").mockReturnValue({
      test: "data",
    });
    startSpinnerSpy = spyOn(spinnerUtils, "startSpinner").mockImplementation(
      () => {},
    );
    succeedSpinnerSpy = spyOn(
      spinnerUtils,
      "succeedSpinner",
    ).mockImplementation(() => {});

    const results = await fileReaderModule.readTranslationFiles(
      baseDir,
      pattern,
    );

    expect(results).toHaveLength(100);
    expect(results[0]?.path).toBe("file0.json");
    expect(results[99]?.path).toBe("file99.json");
  });

  test("should use spinner for each file when reading multiple files", async () => {
    const baseDir = "/project";
    const pattern = "en/**/*.json";

    spyOn(globModule, "glob").mockResolvedValue([
      "/project/en/common.json",
      "/project/en/errors.json",
    ]);
    fsSpy = spyOn(fs, "readFile").mockResolvedValue('{"key": "value"}' as any);
    jsonParserSpy = spyOn(jsonParser, "parseJson").mockReturnValue({
      key: "value",
    });
    startSpinnerSpy = spyOn(spinnerUtils, "startSpinner").mockImplementation(
      () => {},
    );
    succeedSpinnerSpy = spyOn(
      spinnerUtils,
      "succeedSpinner",
    ).mockImplementation(() => {});

    const results = await fileReaderModule.readTranslationFiles(
      baseDir,
      pattern,
    );

    expect(results).toHaveLength(2);
    expect(startSpinnerSpy).toHaveBeenCalledWith(
      "Reading and parsing en/common.json...",
    );
    expect(startSpinnerSpy).toHaveBeenCalledWith(
      "Reading and parsing en/errors.json...",
    );
    expect(succeedSpinnerSpy).toHaveBeenCalledWith(
      "Reading and parsing en/common.json...",
    );
    expect(succeedSpinnerSpy).toHaveBeenCalledWith(
      "Reading and parsing en/errors.json...",
    );
    expect(startSpinnerSpy).toHaveBeenCalledTimes(2);
    expect(succeedSpinnerSpy).toHaveBeenCalledTimes(2);
  });
});
