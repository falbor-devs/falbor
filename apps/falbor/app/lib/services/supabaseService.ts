import { db } from "~/lib/db";
import { supabaseDatabases } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { createScopedLogger } from "~/utils/logger";

const logger = createScopedLogger("api.supabaseService");

export interface SupabaseProjectData {
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectId: string;
  databasePassword?: string;
  databaseUrl?: string;
}

export class SupabaseService {
  private static failedProvisionChats = new Set<string>();
  static async getOrCreateSupabaseProject(chatId: string): Promise<SupabaseProjectData | null> {
    try {
      if (this.failedProvisionChats.has(chatId)) {
        throw new Error("Supabase provisioning previously failed for this chat (max projects reached). Skipping retry.");
      }

      const [existing] = await db.select().from(supabaseDatabases).where(eq(supabaseDatabases.chatId, chatId)).limit(1);

      if (existing) {
        return {
          supabaseUrl: existing.supabaseUrl,
          supabaseAnonKey: existing.supabaseAnonKey,
          projectId: existing.projectId,
          databasePassword: existing.databasePassword,
          databaseUrl: existing.databaseUrl || undefined,
        };
      }

      const accessToken = process.env.SUPABASE_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN;
      const orgId = process.env.SUPABASE_ORG_ID || process.env.NEXT_PUBLIC_SUPABASE_ORG_ID;

      if (!accessToken || !orgId) {
        throw new Error("Missing Supabase credentials: SUPABASE_ACCESS_TOKEN and SUPABASE_ORG_ID must be set in your .env file.");
      }

      logger.info(`Creating a new Supabase project for chat: ${chatId}`);

      const dbPass = this.generatePassword();

      const res = await fetch("https://api.supabase.com/v1/projects", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_id: orgId,
          name: `falbor-${Date.now().toString().slice(-6)}`,
          plan: "free",
          region: "us-east-1",
          db_pass: dbPass
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 400 && errorText.includes("maximum limits")) {
          this.failedProvisionChats.add(chatId);
        }
        throw new Error(`Supabase API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      const projectId = data.id;

      logger.info(`Project ${projectId} created. Waiting for it to become ACTIVE_HEALTHY... (this may take a few minutes)`);
      await this.waitForProjectReady(projectId, accessToken);

      const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectId}/api-keys`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        }
      });

      if (!keysRes.ok) {
        throw new Error(`Failed to fetch API keys: ${await keysRes.text()}`);
      }

      const keysData = await keysRes.json();
      const anonKey = keysData.find((k: any) => k.name === "anon")?.api_key;
      
      const supabaseUrl = `https://${projectId}.supabase.co`;
      const databaseUrl = dbPass ? `postgres://postgres.[${projectId}]:${encodeURIComponent(dbPass)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres` : "";

      if (!anonKey) {
        throw new Error("Missing anon key from Supabase response");
      }

      await db.insert(supabaseDatabases).values({
        chatId,
        supabaseUrl,
        supabaseAnonKey: anonKey,
        projectId,
        databasePassword: dbPass,
        databaseUrl
      });

      logger.info(`Successfully provisioned/reused Supabase project ${projectId} for chat ${chatId}`);
      
      return {
        supabaseUrl,
        supabaseAnonKey: anonKey,
        projectId,
        databasePassword: dbPass,
        databaseUrl
      };
    } catch (error: any) {
      logger.error("Failed to provision Supabase database", error);
      throw new Error(`Supabase Provisioning Failed: ${error.message || String(error)}`);
    }
  }

  private static async waitForProjectReady(projectId: string, accessToken: string, maxAttempts = 60) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      const res = await fetch(`https://api.supabase.com/v1/projects`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        }
      });
      
      if (res.ok) {
        const projects = await res.json();
        const project = projects.find((p: any) => p.id === projectId);
        
        if (project && project.status === "ACTIVE_HEALTHY") {
          return true;
        }
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    throw new Error(`Project ${projectId} did not become ready in time.`);
  }

  private static generatePassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < 20; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  static async executeSql(projectId: string, sql: string): Promise<any> {
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("SUPABASE_ACCESS_TOKEN is not set.");
    }

    const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to execute SQL: ${errorText}`);
    }

    return await res.json();
  }
}
