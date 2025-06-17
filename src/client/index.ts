import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Resource } from "@modelcontextprotocol/sdk/types.js";
import path from "node:path";

class FairytaleClient {
  private client: Client;
  constructor() {
    this.client = new Client(
      {
        name: "fairytale-client",
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
  }

  public async run(): Promise<void> {
    const transport = new StdioClientTransport({
      command: "node",
      args: [path.join(process.cwd(), "build", "server", "index.js")],
    });
    await this.client.connect(transport);
    console.error("🎉The MCP client is running on stdio");
  }

  private setupErrorHandling(): void {
    this.client.onerror = (error) => {
      console.error("[MCP Error]", error);
    };
    process.on("SIGINT", async () => {
      await this.client.close();
      console.error("[MCP] Client closed successfully");
    });
  }

  public async resourcesList(): Promise<Resource[]> {
    const response = await this.client.listResources();
    return response.resources;
  }
}

const client = new FairytaleClient();
client.run();
