import {
  Button,
  DisclosureCard,
  IconButton,
  Input,
  Tooltip,
} from "@ryanmeetup/ui";
import { FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";
import { CountBadge } from "@/components/global";
import type { Subtask } from "@/lib/tasks/task-types";

export function TaskChecklistPanel({
  items,
  newItemTitle,
  onAdd,
  onDelete,
  onNewItemTitleChange,
  onToggle,
  saving,
}: {
  items: Subtask[];
  newItemTitle: string;
  onAdd: () => void;
  onDelete: (item: Subtask) => void;
  onNewItemTitleChange: (value: string) => void;
  onToggle: (item: Subtask) => void;
  saving: boolean;
}) {
  const completed = items.filter((item) => item.is_completed).length;
  return (
    <DisclosureCard
      defaultOpen
      className=""
      buttonClassName="flex w-full items-center justify-between gap-3 py-1 text-left"
      panelClassName="space-y-3 pt-3"
      iconClassName="h-3.5 w-3.5"
      summary={
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
            Checklist
          </span>
          <CountBadge>{items.length}</CountBadge>
        </span>
      }
    >
      {items.length > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(completed / items.length) * 100}%` }}
          />
        </div>
      )}
      {items.length > 0 && (
        <div className="max-h-[min(11.7rem,22.75svh)] space-y-3 overflow-y-auto overscroll-contain pr-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Tooltip
                content={`${item.is_completed ? "Reopen" : "Complete"} ${item.title}`}
              >
                <button
                  type="button"
                  aria-label={`${item.is_completed ? "Reopen" : "Complete"} ${item.title}`}
                  onClick={() => onToggle(item)}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${item.is_completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/20 dark:border-white/25"}`}
                >
                  {item.is_completed && <FiCheck aria-hidden />}
                </button>
              </Tooltip>
              <span
                className={`min-w-0 flex-1 text-sm ${item.is_completed ? "text-black/45 line-through dark:text-white/45" : ""}`}
              >
                {item.title}
              </span>
              <IconButton
                label={`Delete “${item.title}”`}
                variant="danger"
                onClick={() => onDelete(item)}
              >
                <FiTrash2 />
              </IconButton>
            </div>
          ))}
        </div>
      )}
      <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 flex-1">
          <Input
            label="New checklist item"
            hideLabel
            name="new-subtask"
            value={newItemTitle}
            onChange={(event) => onNewItemTitleChange(event.target.value)}
            placeholder="Add a checklist item…"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAdd();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="action"
          leftIcon={<FiPlus />}
          onClick={onAdd}
          loading={saving}
          disabled={saving || !newItemTitle.trim()}
          className="w-full sm:w-auto"
        >
          Add
        </Button>
      </div>
    </DisclosureCard>
  );
}
