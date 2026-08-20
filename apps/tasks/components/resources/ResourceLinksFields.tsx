"use client";

import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, DisclosureCard, IconButton, Input } from "@ryanmeetup/ui";
import { ensureHttpUrlScheme } from "@ryanmeetup/utils";
import { FiMove, FiPlus, FiTrash2 } from "react-icons/fi";
import { CountBadge } from "@/components/global";
import type { ResourceLink } from "@/lib/resource-types";

function SortableLink({ id, label, reorderable, actions, children }: { id: string; label: string; reorderable: boolean; actions: ReactNode; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !reorderable });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  return <div ref={setNodeRef} style={style} className={`flex items-start gap-2 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/10 ${isDragging ? "relative z-10 border-blue-500/60 opacity-80 shadow-lg dark:border-blue-400/60" : ""}`}>
    <div className="flex shrink-0 flex-col items-center gap-2">
      {reorderable && <button type="button" aria-label={`Drag to reorder “${label || "link"}”`} className="grid h-10 w-10 shrink-0 touch-none cursor-grab place-items-center rounded-lg border border-transparent text-black/40 transition hover:border-black/10 hover:bg-black/5 hover:text-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 active:cursor-grabbing dark:text-white/40 dark:hover:border-white/10 dark:hover:bg-white/10 dark:hover:text-white/70 dark:focus-visible:ring-white/30" {...attributes} {...listeners}><FiMove aria-hidden /></button>}
      {actions}
    </div>
    {children}
  </div>;
}

export function ResourceLinksFields({
  links,
  setLinks,
  disabled,
  namePrefix,
}: {
  links: ResourceLink[];
  setLinks: Dispatch<SetStateAction<ResourceLink[]>>;
  disabled: boolean;
  namePrefix: string;
}) {
  const reorderable = !disabled && links.length > 1;
  const itemIds = links.map((_, index) => `${namePrefix}-link-${index}`);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function finishReorder(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const fromIndex = itemIds.indexOf(String(event.active.id));
    const toIndex = itemIds.indexOf(String(event.over.id));
    if (fromIndex >= 0 && toIndex >= 0) setLinks((current) => arrayMove(current, fromIndex, toIndex));
  }

  function update(index: number, field: keyof ResourceLink, value: string) {
    setLinks((current) =>
      current.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  }

  return (
    <DisclosureCard
      defaultOpen
      collapsible={links.length > 0}
      className="rounded-xl border border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.025]"
      buttonClassName="flex w-fit items-center gap-2 text-left"
      panelClassName="pt-3"
      iconClassName="h-3.5 w-3.5"
      description={
        <p className="pr-2 text-xs leading-relaxed text-black/55 dark:text-white/55">
          Attach docs, designs, folders, or any other helpful web page.
        </p>
      }
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<FiPlus aria-hidden />}
          className="shrink-0 px-3 py-1.5 normal-case tracking-normal"
          disabled={disabled || links.length >= 10}
          onClick={() =>
            setLinks((current) => [...current, { label: "", url: "" }])
          }
        >
          Add link
        </Button>
      }
      actionsClassName="mt-3 w-full [&>*]:w-full"
      summary={
        <span className="flex items-center gap-3 pb-1 text-sm font-semibold">
          Useful links
          {links.length > 0 && <CountBadge>{links.length}</CountBadge>}
        </span>
      }
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={finishReorder}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      <div className={links.length > 0 ? "max-h-[min(18rem,35dvh)] space-y-2 overflow-y-auto overscroll-contain pr-1" : undefined}>
        {links.map((link, index) => (
          <SortableLink
            key={itemIds[index]}
            id={itemIds[index]}
            label={link.label}
            reorderable={reorderable}
            actions={
              <IconButton
                type="button"
                label={`Remove “${link.label || "link"}”`}
                size="md"
                variant="danger"
                disabled={disabled}
                onClick={() =>
                  setLinks((current) =>
                    current.filter((_, linkIndex) => linkIndex !== index),
                  )
                }
              >
                <FiTrash2 />
              </IconButton>
            }
          >
            <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] sm:items-end">
            <Input
              label="Label"
              name={`${namePrefix}-link-label-${index}`}
              value={link.label}
              placeholder="Design file"
              maxLength={80}
              required
              disabled={disabled}
              onChange={(event) => update(index, "label", event.target.value)}
            />
            <Input
              label="URL"
              name={`${namePrefix}-link-url-${index}`}
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={link.url}
              placeholder="ryanmeetup.com"
              required
              disabled={disabled}
              onChange={(event) => update(index, "url", event.target.value)}
              onBlur={(event) =>
                update(index, "url", ensureHttpUrlScheme(event.target.value))
              }
            />
            </div>
          </SortableLink>
        ))}
      </div>
      </SortableContext>
      </DndContext>
    </DisclosureCard>
  );
}
