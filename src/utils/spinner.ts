import ora from "ora";

const spinner = ora();

export function startSpinner(text: string) {
  spinner.text = text;
  spinner.start();
}

export function succeedSpinner(text: string) {
  spinner.succeed(text);
}

export function failSpinner(text: string) {
  spinner.fail(text);
}
