import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { FAIRYTALE_PROJECT_DIR } from "../utils.js";
import fs from "node:fs";
import path from "node:path";

class FairytaleServer {
  private server: Server;
  constructor() {
    this.server = new Server(
      {
        name: "fairytale-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupErrorHandling();
    this.setupHandlers();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      console.error("[MCP] Server closed");
      process.exit(0);
    });
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🎉The MCP server is running on stdio");
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const fairytaleProjectDir = FAIRYTALE_PROJECT_DIR();
      const projects = fs.readdirSync(fairytaleProjectDir);

      const resources = await Promise.all(
        projects.map(async (projectId) => {
          const projectPath = path.join(fairytaleProjectDir, projectId);
          const projectJsonPath = path.join(projectPath, "project.json");

          const exists = await fs.promises
            .access(projectJsonPath)
            .then(() => true)
            .catch(() => false);

          const projectName = exists
            ? JSON.parse(fs.readFileSync(projectJsonPath, "utf-8")).videoTitle
            : projectId;

          return {
            uri: `projects://${projectId}/project.json`,
            name: `Fairytale project ${projectName}`,
            description: exists
              ? "Fairytale project configuration file"
              : "Fairytale project directory (configuration file not found)",
            mimeType: "application/json",
            exists: exists,
          };
        })
      );
      return { resources };
    });

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;
        const match = uri.match(/^projects:\/\/(.*)\/project\.json$/);
        if (!match) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid resource URI format"
          );
        }

        const projectId = match[1];
        const projectJsonPath = path.join(
          FAIRYTALE_PROJECT_DIR(),
          projectId,
          "project.json"
        );

        try {
          fs.accessSync(projectJsonPath, fs.constants.R_OK);
          const content = fs.readFileSync(projectJsonPath, "utf-8");
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: content,
              },
            ],
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          )
            throw new McpError(
              ErrorCode.InvalidParams,
              `Fairytale project configuration file not found for ${projectId}`
            );
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to read fairytale project configuration: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "ping-pong",
            description:
              "If user say 'ping', this tool will respond with 'pong'",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "The message to send to the user",
                },
              },
              required: ["message"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      switch (name) {
        case "ping-pong":
          if (args && args.message === "ping") {
            return {
              content: [
                {
                  type: "text",
                  text: "pong",
                },
              ],
            };
          } else
            throw new McpError(
              ErrorCode.InvalidParams,
              "ping-pong tool only accepts 'ping' as input"
            );
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool ${name} not found`
          );
      }
    });
  }
}

const server = new FairytaleServer();
server.run();
