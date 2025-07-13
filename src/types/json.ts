import type { TranslationData } from "./translation";

export type JSONReaderOptions = {
  pattern: string;
  baseDir: string;
  encoding: BufferEncoding;
};

export type JSONResult<T = any> = {
  translations: Record<
    string,
    {
      meta: TranslationData;
      value: T;
    }
  >;
};
