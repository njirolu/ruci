import { describe, test, expect, mock, beforeEach } from "bun:test";

const mockSpinner = {
  start: mock(() => {}),
  succeed: mock(() => {}),
  fail: mock(() => {}),
  text: "",
};

mock.module("ora", () => {
  return {
    __esModule: true,
    default: mock(() => mockSpinner),
  };
});

describe("Spinner Utility", () => {
  let startSpinner: (text: string) => void,
    succeedSpinner: (text: string) => void,
    failSpinner: (text: string) => void;

  beforeEach(async () => {
    mockSpinner.start.mockClear();
    mockSpinner.succeed.mockClear();
    mockSpinner.fail.mockClear();
    mockSpinner.text = "";

    const spinnerModule = await import("../../src/utils/spinner");
    startSpinner = spinnerModule.startSpinner;
    succeedSpinner = spinnerModule.succeedSpinner;
    failSpinner = spinnerModule.failSpinner;
  });

  test("startSpinner should call ora with the correct text and start the spinner", () => {
    const text = "Starting...";
    startSpinner(text);
    expect(mockSpinner.text).toBe(text);
    expect(mockSpinner.start).toHaveBeenCalled();
  });

  test("succeedSpinner should call ora.succeed with the correct text", () => {
    const text = "Succeeded!";
    succeedSpinner(text);
    expect(mockSpinner.succeed).toHaveBeenCalledWith(text);
  });

  test("failSpinner should call ora.fail with the correct text", () => {
    const text = "Failed!";
    failSpinner(text);
    expect(mockSpinner.fail).toHaveBeenCalledWith(text);
  });
});
