import Image from "next/image";
import { IconButton } from "@ryanmeetup/ui";
import { FiExternalLink, FiFile, FiFileText, FiTrash2 } from "react-icons/fi";
import { formatFileSize } from "@/lib/presentation";
import type { ResourceAttachmentDraft } from "@/lib/resource-management";

export function AttachmentList({ items, type, loading, disabled, onRemove }: {
  items: ResourceAttachmentDraft[];
  type: "note" | "file";
  loading: boolean;
  disabled: boolean;
  onRemove: (item: ResourceAttachmentDraft) => void;
}) {
  return <div className={items.length ? "space-y-2" : undefined} aria-busy={loading}>
    {loading && <p className="text-xs text-black/55 dark:text-white/55">Loading {type === "note" ? "notes" : "attachments"}...</p>}
    {items.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/10">
      {type === "file" && item.mime_type?.startsWith("image/") && item.url !== "#" ? <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/5"><Image src={item.url} alt="" fill unoptimized sizes="48px" className="object-cover" /></span> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/5 text-black/55 dark:bg-white/5 dark:text-white/55">{type === "note" ? <FiFileText aria-hidden /> : <FiFile aria-hidden />}</span>}
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p>{type === "note" ? <p className="mt-1 whitespace-pre-wrap text-sm text-black/65 dark:text-white/65">{item.body}</p> : <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">{formatFileSize(item.size_bytes) || "File"}</p>}</div>
      {type === "file" && item.url !== "#" && <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.name} in a new tab`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/30"><FiExternalLink aria-hidden /></a>}
      <IconButton type="button" label={`Remove “${item.name}”`} variant="danger" disabled={disabled} onClick={() => onRemove(item)}><FiTrash2 /></IconButton>
    </div>)}
  </div>;
}
