import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

class TestServer {
  private server: Server;
  constructor() {
    this.server = new Server(
      {
        name: "test-server",
        version: "0.1.0",
      },
      {
        capabilities: {
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

  private setupHandlers(): void {
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
