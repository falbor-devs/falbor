import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { bulkImportMyProspects } from "~/lib/actions/myProspects";
import type { ImportSource } from "./types";

export function useImportCandidates(
  activeTab: ImportSource,
  workspaceId: string,
  onImported: () => void,
) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [connectedUserEmail, setConnectedUserEmail] = useState<string | null>(
    null,
  );
  const [importing, setImporting] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setNeedsAuth(false);
    setCandidates([]);
    setSelectedIds(new Set());
    try {
      const response = await fetch(`/api/contacts/google?source=${activeTab}`);
      const data = await response.json();
      if (data.needsAuth) {
        setNeedsAuth(true);
        setConnectedUserEmail(data.userEmail || null);
      } else if (data.contacts) {
        setConnectedUserEmail(data.userEmail || "connected user");
        setCandidates(data.contacts);
        setSelectedIds(
          new Set(
            data.contacts.map(
              (candidate: any) => candidate.externalId || candidate.email,
            ),
          ),
        );
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void fetchCandidates();
  }, [fetchCandidates]);

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.size === candidates.length
        ? new Set()
        : new Set(
            candidates.map(
              (candidate) => candidate.externalId || candidate.email,
            ),
          ),
    );
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmImport = async () => {
    const selected = candidates.filter((candidate) =>
      selectedIds.has(candidate.externalId || candidate.email),
    );
    if (selected.length === 0) {
      toast.error("Please select at least one contact to import");
      return;
    }
    try {
      setImporting(true);
      const result = await bulkImportMyProspects(workspaceId, selected);
      toast.success(
        `Imported ${result.imported} prospects (${result.skipped} duplicates skipped)`,
      );
      onImported();
    } catch (error) {
      console.error(error);
      toast.error("Failed to import prospects");
    } finally {
      setImporting(false);
    }
  };

  return {
    candidates,
    selectedIds,
    loading,
    needsAuth,
    connectedUserEmail,
    importing,
    fetchCandidates,
    toggleSelectAll,
    toggleSelect,
    handleConfirmImport,
  };
}
