#!/usr/bin/env bun

import {
  binary,
  command,
  number,
  oneOf,
  option,
  optional,
  positional,
  run,
} from "cmd-ts";

import packageJson from "../package.json";
import { server } from "./server";

const app = command({
  name: packageJson.name,
  version: packageJson.version,
  args: {
    transport: positional({
      type: optional(oneOf(["stdio", "http"])),
      displayName: "TRANSPORT",
    }),
    port: option({
      type: number,
      short: "p",
      long: "port",
      description: "Port number -- only relevant for HTTP transport",
      defaultValue: () => 8080,
    }),
  },

  handler,
});

type Arguments = {
  transport?: string;
  port: number;
};

async function handler({ transport = "stdio", port }: Arguments) {
  if (transport === "stdio") {
    server.start({
      transportType: "stdio",
    });
  }
  else {
    server.start({
      transportType: "httpStream",
      httpStream: {
        port,
      },
    });
  }
}

run(binary(app), process.argv);
