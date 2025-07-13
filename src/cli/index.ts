import { program } from "commander";

import { handle } from "@/reporters/error.reporter";

import { setupCommands } from "./commands";
import { setupOptions } from "./options";

export async function run() {
  try {
    setupOptions();
    setupCommands();
    await program.parseAsync(process.argv);
  } catch (error) {
    handle(error);
  }
}
