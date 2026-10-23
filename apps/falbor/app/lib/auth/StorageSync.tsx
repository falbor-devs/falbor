"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "~/hooks/useAuth";

function authHeaders(): Record<string, string> {
  return {};
}

function tryParseJSON(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function migrateFromIndexedDB(): Promise<any[]> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve([]);
    const request = indexedDB.open("falborHistory", 2);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction("chats", "readonly");
        const store = tx.objectStore("chats");
        const all = store.getAll();
        all.onsuccess = () => {
          const chats = all.result || [];
          db.close();
          resolve(chats);
        };
        all.onerror = () => {
          db.close();
          resolve([]);
        };
      } catch {
        db.close();
        resolve([]);
      }
    };
    request.onerror = () => resolve([]);
    request.onupgradeneeded = () => resolve([]);
  });
}

export function StorageSync() {
  const { user } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (!user || synced.current) return;
    synced.current = true;

    
    migrateFromIndexedDB().then((chats) => {
      if (chats.length > 0) {
        const lsSettings: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            lsSettings[key] = tryParseJSON(localStorage.getItem(key)!);
          }
        }
        fetch("/api/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ chats, settings: lsSettings }),
        }).catch(() => {});
      }
    });

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);

    const isHydrating = () =>
      typeof window !== "undefined" && (window as any).__falborHydratingFromServer === true;

    const pendingUpserts = new Map<string, any>();
    const pendingDeletes = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      flushTimer = undefined;
      const upserts = Array.from(pendingUpserts.entries());
      const deletes = Array.from(pendingDeletes.values());
      pendingUpserts.clear();
      pendingDeletes.clear();
      for (const [key, value] of upserts) {
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ key, value }),
        }).catch(() => {});
      }
      for (const key of deletes) {
        fetch(`/api/sync?key=${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => {});
      }
    };

    const scheduleFlush = () => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(flush, 1500);
    };

    const overrideSetItem = (key: string, value: string) => {
      originalSetItem(key, value);
      if (isHydrating()) return;
      pendingDeletes.delete(key);
      pendingUpserts.set(key, tryParseJSON(value));
      scheduleFlush();
    };

    const overrideRemoveItem = (key: string) => {
      originalRemoveItem(key);
      if (isHydrating()) return;
      pendingUpserts.delete(key);
      pendingDeletes.add(key);
      scheduleFlush();
    };

    localStorage.setItem = overrideSetItem;
    localStorage.removeItem = overrideRemoveItem;

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, [user]);

  return null;
}
