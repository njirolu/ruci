import { describe, it, expect, mock, afterEach, spyOn } from "bun:test";
import { verifyProjectKeys } from "../../../src/core/checkers/verify-project-keys";
import type {
  TranslationFile,
  TranslationUsage,
} from "../../../src/types/translation";
import * as globModule from "glob";
import * as fileReaderModule from "../../../src/core/services/file-reader";
import * as keyExtractorModule from "../../../src/core/services/key-extractor";

describe("verifyProjectKeys", () => {
  afterEach(() => {
    mock.restore();
  });

  it("should identify missing keys in project when base language has unused keys", async () => {
    const projectFilePatterns = ["src/**/*.ts", "src/**/*.html"];
    const baseLanguagePath = "i18n/en.json";
    const baseDir = "/project";

    spyOn(globModule, "glob")
      .mockResolvedValueOnce([
        "/project/src/app.ts",
        "/project/src/component.ts",
      ])
      .mockResolvedValueOnce(["/project/src/template.html"]);

    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        common: {
          hello: "Hello",
          goodbye: "Goodbye",
        },
        errors: {
          notFound: "Not found",
        },
      },
    };
    spyOn(fileReaderModule, "readTranslationFile").mockResolvedValue(
      baseLangFile,
    );

    const usagesFromTs1: TranslationUsage[] = [
      {
        key: "common.hello",
        filePath: "/project/src/app.ts",
        lineNumber: 10,
        fileType: "typescript",
      },
    ];
    const usagesFromTs2: TranslationUsage[] = [
      {
        key: "errors.notFound",
        filePath: "/project/src/component.ts",
        lineNumber: 5,
        fileType: "typescript",
      },
    ];
    const usagesFromHtml: TranslationUsage[] = [];

    spyOn(keyExtractorModule, "extractTranslationUsagesFromFile")
      .mockResolvedValueOnce(usagesFromTs1)
      .mockResolvedValueOnce(usagesFromTs2)
      .mockResolvedValueOnce(usagesFromHtml);

    const result = await verifyProjectKeys(
      projectFilePatterns,
      baseLanguagePath,
      baseDir,
    );

    expect(result.missingInProject).toHaveLength(1);
    expect(result.missingInProject[0]?.key).toBe("common.goodbye");
    expect(result.missingInProject[0]?.filePath).toBe("N/A");
    expect(result.missingInProject[0]?.lineNumber).toBe(0);
    expect(result.missingInProject[0]?.fileType).toBe("html");

    expect(result.unusedInBaseLanguage).toHaveLength(0);
  });

  it("should identify unused keys in base language when project uses non-existent keys", async () => {
    const projectFilePatterns = ["src/**/*.ts"];
    const baseLanguagePath = "i18n/en.json";
    const baseDir = "/project";

    spyOn(globModule, "glob").mockResolvedValue(["/project/src/app.ts"]);

    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        common: {
          hello: "Hello",
        },
      },
    };
    spyOn(fileReaderModule, "readTranslationFile").mockResolvedValue(
      baseLangFile,
    );

    const usages: TranslationUsage[] = [
      {
        key: "common.hello",
        filePath: "/project/src/app.ts",
        lineNumber: 10,
        fileType: "typescript",
      },
      {
        key: "common.nonexistent",
        filePath: "/project/src/app.ts",
        lineNumber: 15,
        fileType: "typescript",
      },
    ];
    spyOn(
      keyExtractorModule,
      "extractTranslationUsagesFromFile",
    ).mockResolvedValue(usages);

    const result = await verifyProjectKeys(
      projectFilePatterns,
      baseLanguagePath,
      baseDir,
    );

    expect(result.missingInProject).toHaveLength(0);
    expect(result.unusedInBaseLanguage).toHaveLength(1);
    expect(result.unusedInBaseLanguage[0]?.key).toBe("common.nonexistent");
    expect(result.unusedInBaseLanguage[0]?.filePath).toBe(
      "/project/src/app.ts",
    );
    expect(result.unusedInBaseLanguage[0]?.lineNumber).toBe(15);
  });

  it("should handle mixed HTML and TypeScript files", async () => {
    const projectFilePatterns = ["src/**/*.{ts,html}"];
    const baseLanguagePath = "i18n/en.json";
    const baseDir = "/project";

    spyOn(globModule, "glob").mockResolvedValue([
      "/project/src/app.ts",
      "/project/src/template.html",
      "/project/src/component.ts",
    ]);

    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        title: "Title",
        description: "Description",
      },
    };
    spyOn(fileReaderModule, "readTranslationFile").mockResolvedValue(
      baseLangFile,
    );

    const tsUsages: TranslationUsage[] = [
      {
        key: "title",
        filePath: "/project/src/app.ts",
        lineNumber: 5,
        fileType: "typescript",
      },
    ];
    const htmlUsages: TranslationUsage[] = [
      {
        key: "description",
        filePath: "/project/src/template.html",
        lineNumber: 3,
        fileType: "html",
      },
    ];

    spyOn(
      keyExtractorModule,
      "extractTranslationUsagesFromFile",
    ).mockImplementation(async (filePath: string) => {
      if (filePath.endsWith(".html")) {
        return htmlUsages;
      }
      return tsUsages;
    });

    const result = await verifyProjectKeys(
      projectFilePatterns,
      baseLanguagePath,
      baseDir,
    );

    expect(result.missingInProject).toHaveLength(0);
    expect(result.unusedInBaseLanguage).toHaveLength(0);

    expect(
      keyExtractorModule.extractTranslationUsagesFromFile,
    ).toHaveBeenCalledWith("/project/src/app.ts", "typescript");
    expect(
      keyExtractorModule.extractTranslationUsagesFromFile,
    ).toHaveBeenCalledWith("/project/src/template.html", "html");
    expect(
      keyExtractorModule.extractTranslationUsagesFromFile,
    ).toHaveBeenCalledWith("/project/src/component.ts", "typescript");
  });

  it("should handle empty project files", async () => {
    const projectFilePatterns = ["src/**/*.ts"];
    const baseLanguagePath = "i18n/en.json";
    const baseDir = "/project";

    // Mock glob to return no files
    spyOn(globModule, "glob").mockResolvedValue([]);

    // Mock base language file
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        hello: "Hello",
      },
    };
    spyOn(fileReaderModule, "readTranslationFile").mockResolvedValue(
      baseLangFile,
    );

    const result = await verifyProjectKeys(
      projectFilePatterns,
      baseLanguagePath,
      baseDir,
    );

    expect(result.missingInProject).toHaveLength(1);
    expect(result.missingInProject[0]?.key).toBe("hello");
    expect(result.unusedInBaseLanguage).toHaveLength(0);
  });

  it("should handle empty base language file", async () => {
    const projectFilePatterns = ["src/**/*.ts"];
    const baseLanguagePath = "i18n/en.json";
    const baseDir = "/project";

    // Mock glob to return files
    spyOn(globModule, "glob").mockResolvedValue(["/project/src/app.ts"]);

    // Mock empty base language file
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {},
    };
    spyOn(fileReaderModule, "readTranslationFile").mockResolvedValue(
      baseLangFile,
    );

    // Mock key extraction
    const usages: TranslationUsage[] = [
      {
        key: "some.key",
        filePath: "/project/src/app.ts",
        lineNumber: 10,
        fileType: "typescript",
      },
    ];
    spyOn(
      keyExtractorModule,
      "extractTranslationUsagesFromFile",
    ).mockResolvedValue(usages);

    const result = await verifyProjectKeys(
      projectFilePatterns,
      baseLanguagePath,
      baseDir,
    );

    expect(result.missingInProject).toHaveLength(0);
    expect(result.unusedInBaseLanguage).toHaveLength(1);
    expect(result.unusedInBaseLanguage[0]?.key).toBe("some.key");
  });

  it("should handle file processing errors gracefully", async () => {
    const projectFilePatterns = ["src/**/*.ts"];
    const baseLanguagePath = "i18n/en.json";
    const baseDir = "/project";

    // Mock console.error to capture error logs
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    // Mock glob to return files
    spyOn(globModule, "glob").mockResolvedValue([
      "/project/src/app.ts",
      "/project/src/error.ts",
    ]);

    // Mock base language file
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: { hello: "Hello" },
    };
    spyOn(fileReaderModule, "readTranslationFile").mockResolvedValue(
      baseLangFile,
    );

    // Mock key extraction - one succeeds, one fails
    spyOn(keyExtractorModule, "extractTranslationUsagesFromFile")
      .mockResolvedValueOnce([
        {
          key: "hello",
          filePath: "/project/src/app.ts",
          lineNumber: 5,
          fileType: "typescript",
        },
      ])
      .mockRejectedValueOnce(new Error("File processing failed"));

    const result = await verifyProjectKeys(
      projectFilePatterns,
      baseLanguagePath,
      baseDir,
    );

    expect(result.missingInProject).toHaveLength(0);
    expect(result.unusedInBaseLanguage).toHaveLength(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "⚠️ Failed to process a file:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should handle multiple project file patterns", async () => {
    const projectFilePatterns = ["src/**/*.ts", "components/**/*.html"];
    const baseLanguagePath = "i18n/en.json";
    const baseDir = "/project";

    // Mock glob to return different files for different patterns
    spyOn(globModule, "glob")
      .mockResolvedValueOnce(["/project/src/app.ts"])
      .mockResolvedValueOnce(["/project/components/header.html"]);

    // Mock base language file
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        app: "App",
        header: "Header",
      },
    };
    spyOn(fileReaderModule, "readTranslationFile").mockResolvedValue(
      baseLangFile,
    );

    // Mock key extraction
    spyOn(keyExtractorModule, "extractTranslationUsagesFromFile")
      .mockResolvedValueOnce([
        {
          key: "app",
          filePath: "/project/src/app.ts",
          lineNumber: 1,
          fileType: "typescript",
        },
      ])
      .mockResolvedValueOnce([
        {
          key: "header",
          filePath: "/project/components/header.html",
          lineNumber: 1,
          fileType: "html",
        },
      ]);

    const result = await verifyProjectKeys(
      projectFilePatterns,
      baseLanguagePath,
      baseDir,
    );

    expect(result.missingInProject).toHaveLength(0);
    expect(result.unusedInBaseLanguage).toHaveLength(0);

    // Verify glob was called for each pattern
    expect(globModule.glob).toHaveBeenCalledWith("src/**/*.ts", {
      cwd: baseDir,
      absolute: true,
    });
    expect(globModule.glob).toHaveBeenCalledWith("components/**/*.html", {
      cwd: baseDir,
      absolute: true,
    });
  });
});
