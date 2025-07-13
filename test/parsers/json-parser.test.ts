import { test, expect, mock, spyOn, describe } from "bun:test";

mock.module("node:fs/promises", () => ({
  readFile: mock(async () => "{}"),
}));

mock.module("node:path", () => ({
  basename: mock((filePath: string, ext: string) => {
    const base = filePath.split("/").pop() ?? "";
    return base.replace(ext, "");
  }),
}));

mock.module("../utils/path", () => ({
  findFilesByPattern: mock(async () => []),
}));

import * as fs from "node:fs/promises";
import { InvalidJsonError, FileNotFoundError } from "../../src/core/errors"; // Adjust path if needed

import * as pathUtils from "../../src/utils/path";
import {
  parseJson,
  loadTranslationsFromFiles,
  readFileJSON,
  flattenObject,
} from "../../src/parsers/json-parser"; // Adjust path to your file

describe("flattenObject", () => {
  test("should flatten a nested object", () => {
    const obj = { a: { b: "c", d: { e: "f" } }, g: "h" };
    const expected = { "a.b": "c", "a.d.e": "f", g: "h" };
    expect(flattenObject(obj)).toEqual(expected);
  });

  test("should return an empty object if input is empty", () => {
    expect(flattenObject({})).toEqual({});
  });

  test("should ignore non-string, non-object values and arrays", () => {
    const obj = {
      a: 123,
      b: null,
      c: true,
      d: { e: "hello" },
      f: undefined,
      h: [1, 2],
    };
    expect(flattenObject(obj)).toEqual({ "d.e": "hello" });
  });
});

describe("parseJson", () => {
  test("should parse a valid JSON string", () => {
    const jsonString = '{"key": "value"}';
    expect(parseJson(jsonString)).toEqual({ key: "value" });
  });

  test("should throw InvalidJsonError with 'unknown' path when filePath is not provided", () => {
    const invalidJson = '{"key": "value",';

    expect(() => parseJson(invalidJson)).toThrow(
      new InvalidJsonError(
        "unknown",
        "JSON Parse error: Property name must be a string literal",
      ),
    );
  });

  test("should include filePath in the error message if provided", () => {
    const invalidJson = '{"key": "value",';
    const filePath = "src/data/en.json";
    expect(() => parseJson(invalidJson, filePath)).toThrow(
      new InvalidJsonError(
        filePath,
        "JSON Parse error: Property name must be a string literal",
      ),
    );
  });
});

describe("loadTranslationsFromFiles", () => {
  test("should load and parse multiple files correctly", async () => {
    const filePaths = ["/data/en.json", "/data/de.json"];
    const readFileSpy = spyOn(fs, "readFile")
      .mockResolvedValueOnce('{"hello": "Hello"}')
      .mockResolvedValueOnce('{"hello": "Hallo"}');

    const results = await loadTranslationsFromFiles(filePaths);

    expect(readFileSpy).toHaveBeenCalledTimes(2);
    expect(results.translations?.en?.value).toEqual({ hello: "Hello" });
    expect(results.translations?.de?.value).toEqual({ hello: "Hallo" });
  });

  test("should use custom encoding when provided", async () => {
    const filePaths = ["/data/en.json"];
    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue("{}");

    // Test the options merging logic
    await loadTranslationsFromFiles(filePaths, { encoding: "latin1" });

    expect(readFileSpy).toHaveBeenCalledWith(filePaths[0], "latin1");
  });

  test("should return an empty object when given an empty file list", async () => {
    // This tests the edge case of an empty input array
    const results = await loadTranslationsFromFiles([]);
    expect(results).toEqual({ translations: {} });
  });

  test("should reject if fs.readFile fails", async () => {
    const filePaths = ["/data/en.json"];
    spyOn(fs, "readFile").mockRejectedValue(new Error("File access denied"));

    await expect(loadTranslationsFromFiles(filePaths)).rejects.toThrow(
      "File access denied",
    );
  });

  test("should reject if a file contains invalid JSON", async () => {
    const filePaths = ["/data/en.json"];
    // Mock readFile to return a broken JSON string to test the catch block in parseJson
    spyOn(fs, "readFile").mockResolvedValue("{ not json }");

    await expect(loadTranslationsFromFiles(filePaths)).rejects.toThrow(
      InvalidJsonError,
    );
  });
});

describe("readFileJSON", () => {
  test("should find files and load translations", async () => {
    const options = {
      baseDir: "/app",
      pattern: "**/*.json",
      encoding: "utf-8" as BufferEncoding,
    };
    const fakeFiles = ["/app/en.json"];

    const findFilesSpy = spyOn(
      pathUtils,
      "findFilesByPattern",
    ).mockResolvedValue(fakeFiles);
    const readFileSpy = spyOn(fs, "readFile")
      .mockClear()
      .mockResolvedValue('{"ok": "OK"}');

    const result = await readFileJSON(options);

    expect(findFilesSpy).toHaveBeenCalledWith(options);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(result.translations?.en?.value).toEqual({ ok: "OK" });
  });

  test("should propagate errors from findFilesByPattern", async () => {
    const options = {
      baseDir: "/app",
      pattern: "**/*.json",
      encoding: "utf-8" as BufferEncoding,
    };
    const expectedError = new FileNotFoundError(options.pattern, {
      path: options.baseDir,
    });

    spyOn(pathUtils, "findFilesByPattern").mockRejectedValue(expectedError);

    await expect(readFileJSON(options)).rejects.toThrow(expectedError);
  });
});
