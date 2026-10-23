"use client";

import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { AISidebar } from "~/components/ai-side/AISidebar";
import { ClientSidebar } from "~/components/sidebar/ClientSidebar";
import { aiSidebarStore } from "~/lib/stores/aiSidebar";
import { ProductLabView } from "./ProductLabView";
import type {
  ProductLabCanvasAgent,
  ProductLabCanvasRelationship,
} from "./components/ProductLabCanvas";
import type {
  ProductLabInteractionData,
  ProductLabProjectData,
  ProductLabReportData,
  ProductLabSimulationRow,
} from "./types";

interface ProductLabPageShellProps {
  workspaceId: string;
  initialProject: ProductLabProjectData;
  initialSimulations: ProductLabSimulationRow[];
  initialAgents: ProductLabCanvasAgent[];
  initialRelationships: ProductLabCanvasRelationship[];
  initialInteractions: ProductLabInteractionData[];
  initialSimulationId: string | null;
  initialReport: ProductLabReportData | null;
}

export function ProductLabPageShell(props: ProductLabPageShellProps) {
  const storedChatMode = useStore(aiSidebarStore.productLabChatMode);
  const [chatMode, setChatMode] = useState(storedChatMode);

  useEffect(() => setChatMode(storedChatMode), [storedChatMode]);

  useEffect(() => {
    const open = () => setChatMode(true);
    const close = () => setChatMode(false);
    window.addEventListener("falbor:open-product-lab-chat", open);
    window.addEventListener("falbor:close-product-lab-chat", close);
    return () => {
      window.removeEventListener("falbor:open-product-lab-chat", open);
      window.removeEventListener("falbor:close-product-lab-chat", close);
    };
  }, []);

  useEffect(() => {
    aiSidebarStore.setWorkspace(
      props.workspaceId,
      [],
      null,
      "Product Lab Agent Chat",
    );
    aiSidebarStore.setAgent(null);
  }, [props.workspaceId, props.initialSimulationId]);

  useEffect(() => {
    aiSidebarStore.setProductLabContext(
      props.initialSimulationId,
      props.initialAgents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.persona.role,
      })),
    );
  }, [props.initialSimulationId, props.initialAgents]);

  useEffect(() => () => aiSidebarStore.clearProductLabContext(), []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-[#212121]">
      <ClientSidebar />
      <div className="min-w-0 flex-1 overflow-hidden">
        {chatMode ? (
          <div className="flex h-full w-full bg-white dark:bg-[#212121]">
            <div className="min-w-0 flex-1 overflow-hidden">
              <ProductLabView {...props} canvasOnly />
            </div>
            <AISidebar
              className="h-full w-[30%] border-0 max-md:w-full"
              style={{ width: "30%", minWidth: "30%" }}
            />
          </div>
        ) : (
          <ProductLabView {...props} />
        )}
      </div>
    </div>
  );
}
