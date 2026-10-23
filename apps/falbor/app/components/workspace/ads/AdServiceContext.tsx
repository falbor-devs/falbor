"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogDescription, DialogRoot, DialogTitle } from "~/components/ui/Dialog";

type Service = { id: string; name: string; description: string | null; imageUrl: string | null };

export function AdServiceContext({ workspaceId, onChange }: { workspaceId: string; onChange?: (service: Service | null) => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch(`/api/workspace/${workspaceId}/ads-marketing/services`).then((r) => r.ok ? r.json() : { services: [] }).then((d) => setServices(d.services || [])); }, [workspaceId]);
  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/workspace/${workspaceId}/ads-marketing/services`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, sourceUrl, imageUrl }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setServices((items) => [data.service, ...items]); setSelected(data.service); onChange?.(data.service); setCreateOpen(false); setOpen(false); setName(""); setDescription(""); setSourceUrl(""); setImageUrl(null); }
    setBusy(false);
  };
  return <>
    <button type="button" onClick={() => setOpen(true)} className="mb-4 flex w-full items-center justify-between rounded-xl border border-gray-300 px-4 py-3 text-left dark:border-gray-700">
      <span><span className="block text-[10px] uppercase tracking-wide text-gray-500">Context</span><span className="text-sm font-medium dark:text-white">{selected?.name || "Select a service"}</span></span><i className="i-ph:caret-right text-gray-400" />
    </button>
    <DialogRoot open={open} onOpenChange={setOpen}><Dialog className="!w-[min(440px,92vw)] !max-w-[440px] p-6"><DialogTitle>Select a service</DialogTitle><DialogDescription>Choose the product context for this image ad.</DialogDescription><div className="mt-5 space-y-2">{services.map((service) => <button key={service.id} type="button" onClick={() => { setSelected(service); onChange?.(service); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">{service.imageUrl ? <img src={service.imageUrl} className="h-full w-full rounded-lg object-cover" alt="" /> : <i className="i-ph:tag" />}</span><span className="text-sm font-medium dark:text-white">{service.name}</span></button>)}<button type="button" onClick={() => { setCreateOpen(true); setOpen(false); }} className="flex w-full items-center justify-between rounded-xl border border-dashed border-gray-300 p-3 text-sm dark:border-gray-700"><span><i className="i-ph:plus mr-2" />Create new</span><i className="i-ph:arrow-right" /></button></div></Dialog></DialogRoot>
    <DialogRoot open={createOpen} onOpenChange={setCreateOpen}><Dialog className="!w-[min(620px,92vw)] !max-w-[620px] p-6"><DialogTitle>Add new product or service</DialogTitle><DialogDescription>Paste a product link or add the details manually.</DialogDescription><div className="mt-5 space-y-4"><input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Paste a link to import media and details" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none dark:border-gray-800 dark:bg-gray-900" /><div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700"><input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setImageUrl(String(reader.result)); reader.readAsDataURL(file); }} /><p className="mt-2 text-xs">Upload a product image (optional)</p></div><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product, service, or brand name" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none dark:border-gray-800 dark:bg-gray-900" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the benefits and key features" className="min-h-24 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none dark:border-gray-800 dark:bg-gray-900" /><button type="button" disabled={busy || !name.trim()} onClick={create} className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-gray-900">{busy ? "Analyzing your link…" : "Create"}</button></div></Dialog></DialogRoot>
  </>;
}
