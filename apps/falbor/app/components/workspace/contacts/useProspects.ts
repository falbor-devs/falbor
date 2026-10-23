import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  deleteMyProspect,
  getMyProspects,
  sendMyProspectToAiProspects,
  updateMyProspectStatus,
  type MyProspect,
  type ProspectStatus,
} from "~/lib/actions/myProspects";
import type { ContactFilter } from "./types";

export function useProspects(workspaceId: string) {
  const [prospects, setProspects] = useState<MyProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ContactFilter>("all");
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadProspects = useCallback(async () => {
    try {
      setLoading(true);
      setProspects(await getMyProspects(workspaceId));
    } catch (error) {
      console.error("Failed to fetch prospects", error);
      toast.error("Failed to load prospects");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) void loadProspects();
  }, [loadProspects, workspaceId]);

  const handleStatusChange = useCallback(
    async (id: string, status: ProspectStatus) => {
      try {
        await updateMyProspectStatus(id, status);
        setProspects((current) =>
          current.map((prospect) =>
            prospect.id === id ? { ...prospect, status } : prospect,
          ),
        );
        toast.success("Status updated");
      } catch {
        toast.error("Failed to update status");
      }
    },
    [],
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this prospect?")) return;
    try {
      await deleteMyProspect(id);
      setProspects((current) =>
        current.filter((prospect) => prospect.id !== id),
      );
      toast.success("Prospect deleted");
    } catch {
      toast.error("Failed to delete prospect");
    }
  }, []);

  const handleSendToAi = useCallback(
    async (prospect: MyProspect) => {
      setSendingId(prospect.id);
      try {
        await sendMyProspectToAiProspects(workspaceId, prospect);
        setProspects((current) =>
          current.filter((item) => item.id !== prospect.id),
        );
        toast.success(`Moved ${prospect.name} to AI Prospects table`);
      } catch (error) {
        console.error(error);
        toast.error("Failed to send prospect to AI");
      } finally {
        setSendingId(null);
      }
    },
    [workspaceId],
  );

  const counts = useMemo(
    () => ({
      all: prospects.length,
      new: prospects.filter((prospect) => prospect.status === "new").length,
      contacted: prospects.filter((prospect) => prospect.status === "contacted")
        .length,
      replied: prospects.filter((prospect) => prospect.status === "replied")
        .length,
      qualified: prospects.filter((prospect) => prospect.status === "qualified")
        .length,
      customer: prospects.filter((prospect) => prospect.status === "customer")
        .length,
    }),
    [prospects],
  );

  const filteredProspects = useMemo(
    () =>
      filterStatus === "all"
        ? prospects
        : prospects.filter((prospect) => prospect.status === filterStatus),
    [filterStatus, prospects],
  );

  return {
    prospects,
    loading,
    filterStatus,
    setFilterStatus,
    sendingId,
    counts,
    filteredProspects,
    loadProspects,
    handleStatusChange,
    handleDelete,
    handleSendToAi,
  };
}
