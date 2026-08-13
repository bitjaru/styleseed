#!/usr/bin/env node

import { basename, dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { grantFileName, verifySharePackage } from "../skills/ss-learn/scripts/learning-package.mjs";
import { assertDirectChild, claimFileOnce, readJsonNoFollow } from "../skills/ss-learn/scripts/secure-fs.mjs";

const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2025-06-18";

const tools = [
  {
    name: "styleseed_learning_boundary",
    title: "Explain the StyleSeed learning boundary",
    description: "Return the privacy and approval boundary of the local StyleSeed learning bridge. This reads no project files.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} },
    outputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["projectScanning", "networkTransport", "automaticPromotion", "packageRead"],
      properties: {
        projectScanning: { const: false },
        networkTransport: { const: false },
        automaticPromotion: { const: false },
        packageRead: { type: "string" },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "styleseed_consume_approved_learning_package",
    title: "Consume one approved StyleSeed learning package",
    description: "Read exactly one privacy-minimized StyleSeed share package after a human created a matching one-time MCP grant. Consumes that grant before returning the package to this MCP client and model. Does not scan projects, upload data, or promote rules.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["packagePath", "packageHash"],
      properties: {
        packagePath: { type: "string", minLength: 1, description: "Exact local path shown by ss-learn prepare-share." },
        packageHash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$", description: "Exact package hash approved by the person." },
      },
    },
    outputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["status", "grantConsumed", "clientExposure", "package"],
      properties: {
        status: { const: "approved-package-read" },
        grantConsumed: { const: true },
        clientExposure: { const: true },
        package: { type: "object" },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
];

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  const missing = allowed.filter((key) => !(key in value));
  if (extra.length || missing.length) throw new Error(`${label} fields are invalid.`);
}

async function readGrantedPackage(args) {
  exactKeys(args, ["packagePath", "packageHash"], "tool arguments");
  if (typeof args.packagePath !== "string" || !/^sha256:[0-9a-f]{64}$/.test(args.packageHash)) throw new Error("packagePath and packageHash are required.");
  const requestedPath = resolve(args.packagePath);
  const shareRoot = dirname(requestedPath);
  const learningRoot = resolve(shareRoot, "..");
  if (basename(shareRoot) !== "share" || basename(learningRoot) !== "learning" || basename(dirname(learningRoot)) !== ".styleseed") {
    throw new Error("The package must be directly inside .styleseed/learning/share/.");
  }
  const packagePath = await assertDirectChild(shareRoot, requestedPath, ".json");
  const packageValue = verifySharePackage(await readJsonNoFollow(packagePath, { root: shareRoot }));
  if (packageValue.packageHash !== args.packageHash) throw new Error("The approved package hash does not match the file.");
  const grantPath = resolve(learningRoot, "mcp-grants", grantFileName(args.packageHash));
  let claimedGrantPath;
  try {
    claimedGrantPath = await claimFileOnce(grantPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error("No one-time MCP grant exists. Run ss-learn grant-mcp-read after explicit human approval.");
    }
    throw error;
  }
  const grant = await readJsonNoFollow(claimedGrantPath, { root: resolve(learningRoot, "claims") });
  exactKeys(grant, ["schemaVersion", "kind", "packageHash", "candidateId", "purpose", "usesRemaining", "clientExposureAcknowledged", "createdAt", "attestationHash"], "MCP grant");
  if (grant.schemaVersion !== 1 || grant.kind !== "styleseed-mcp-read-grant" || grant.packageHash !== packageValue.packageHash || grant.candidateId !== packageValue.candidate.id || grant.purpose !== packageValue.purpose || grant.usesRemaining !== 1 || grant.clientExposureAcknowledged !== true || Number.isNaN(Date.parse(grant.createdAt)) || !/^sha256:[0-9a-f]{64}$/.test(grant.attestationHash)) {
    throw new Error("The one-time MCP grant does not match this package.");
  }
  return {
    status: "approved-package-read",
    grantConsumed: true,
    clientExposure: true,
    package: packageValue,
  };
}

function toolResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function errorResult(error) {
  return {
    content: [{ type: "text", text: `StyleSeed learning bridge rejected the request: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true,
  };
}

async function handleToolCall(params) {
  if (!params || typeof params.name !== "string") throw new Error("Tool name is required.");
  if (params.name === "styleseed_learning_boundary") {
    return toolResult({
      projectScanning: false,
      networkTransport: false,
      automaticPromotion: false,
      packageRead: "One exact approved package can be returned to the MCP client/model only after a separate one-time human grant.",
    });
  }
  if (params.name === "styleseed_consume_approved_learning_package") return toolResult(await readGrantedPackage(params.arguments));
  throw new Error(`Unknown tool: ${params.name}`);
}

function response(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function errorResponse(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handleMessage(message) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return errorResponse(message?.id, -32600, "Invalid Request");
  if (message.id === undefined) return null;
  if (message.method === "initialize") {
    return response(message.id, {
      protocolVersion: typeof message.params?.protocolVersion === "string" ? message.params.protocolVersion : PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "styleseed-learning", version: SERVER_VERSION },
      instructions: "Never scan a project. Consume only a package with a matching one-time ss-learn MCP grant, and disclose that the package is now visible to the MCP client/model.",
    });
  }
  if (message.method === "ping") return response(message.id, {});
  if (message.method === "tools/list") return response(message.id, { tools });
  if (message.method === "tools/call") {
    try {
      return response(message.id, await handleToolCall(message.params));
    } catch (error) {
      return response(message.id, errorResult(error));
    }
  }
  return errorResponse(message.id, -32601, "Method not found");
}

function send(message) {
  if (message) process.stdout.write(`${JSON.stringify(message)}\n`);
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
let queue = Promise.resolve();
input.on("line", (line) => {
  queue = queue.then(() => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      send(errorResponse(null, -32700, error instanceof Error ? error.message : "Parse error"));
      return;
    }
    return handleMessage(message)
      .then((message) => {
        send(message);
      })
      .catch((error) => {
        send(errorResponse(null, -32603, error instanceof Error ? error.message : "Internal error"));
      });
  });
});
input.on("close", () => {
  queue.finally(() => process.exit(0));
});
