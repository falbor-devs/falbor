import { db } from "~/lib/db";
import { neonDatabases } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { createScopedLogger } from "~/utils/logger";

const logger = createScopedLogger("api.neonService");

export interface NeonProjectData {
  databaseUrl: string;
  projectId: string;
  databaseName: string;
  ownerName: string;
  host: string;
  password?: string;
}

export class NeonService {
  private static failedProvisionChats = new Set<string>();

  static async getOrCreateNeonDatabase(chatId: string): Promise<NeonProjectData | null> {
    try {
      if (this.failedProvisionChats.has(chatId)) {
        throw new Error("Neon provisioning previously failed for this chat (max projects reached). Skipping retry.");
      }

      const [existing] = await db.select().from(neonDatabases).where(eq(neonDatabases.chatId, chatId)).limit(1);

      if (existing) {
        return {
          databaseUrl: existing.databaseUrl,
          projectId: existing.projectId,
          databaseName: "neondb",
          ownerName: "neondb_owner",
          host: "",
        };
      }

      const apiKey = process.env.NEON_API_KEY;
      if (!apiKey) {
        throw new Error("Missing Neon credentials: NEON_API_KEY must be set in your .env file.");
      }

      logger.info(`Creating a new Neon project for chat: ${chatId}`);

      const projectPayload: any = {
        name: `falbor-${Date.now().toString().slice(-6)}`,
        region_id: "aws-us-east-1",
        pg_version: 17,
      };

      const orgId = process.env.NEON_ORG_ID;
      if (orgId) {
        projectPayload.org_id = orgId;
      }

      const res = await fetch("https://console.neon.tech/api/v2/projects", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ project: projectPayload }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 400 && (errorText.includes("maximum") || errorText.includes("limit"))) {
          this.failedProvisionChats.add(chatId);
        }
        throw new Error(`Neon API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      const connectionUri = data.connection_uris?.[0]?.connection_uri;
      const projectId = data.project?.id;
      const connectionParams = data.connection_uris?.[0]?.connection_parameters || {};
      const databaseName = connectionParams.database || data.databases?.[0]?.name || "neondb";
      const ownerName = connectionParams.role || data.roles?.[0]?.name || "neondb_owner";
      const host = connectionParams.host || "";

      if (!connectionUri || !projectId) {
        throw new Error("Invalid response from Neon API: missing connection_uri or project.id");
      }

      await db.insert(neonDatabases).values({
        chatId,
        databaseUrl: connectionUri,
        projectId: projectId,
      });

      logger.info(`Successfully provisioned Neon project ${projectId} for chat ${chatId}`);
      return {
        databaseUrl: connectionUri,
        projectId,
        databaseName,
        ownerName,
        host,
        password: connectionParams.password,
      };
    } catch (error: any) {
      logger.error("Failed to provision Neon database", error);
      throw new Error(`Neon Provisioning Failed: ${error.message || String(error)}`);
    }
  }
}