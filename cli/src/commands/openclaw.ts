
import * as p from "@clack/prompts";
import pc from "picocolors";
import { printPaperclipCliBanner } from "../utils/banner.js";

export async function openclaw(opts: {
  config?: string;
  repair?: boolean;
  yes?: boolean;
}): Promise<void> {
  printPaperclipCliBanner();
  p.intro(pc.bgCyan(pc.black(" paperclip openclaw ")));

  p.log.info("Not implemented yet.");

  p.outro(pc.green("openclaw command finished."));
}
