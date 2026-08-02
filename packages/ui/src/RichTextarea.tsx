"use client";

import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type TextareaHTMLAttributes,
} from "react";
import { FiCornerDownRight } from "react-icons/fi";
import { LuIndentDecrease, LuIndentIncrease } from "react-icons/lu";
import {
  markdownToHtml,
  normalizeRichTextValue,
  tiptapJsonToMarkdown,
} from "./richTextMarkdown";

export type RichTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "children"
>;

const RichTextarea = forwardRef<HTMLTextAreaElement, RichTextareaProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      onBlur,
      placeholder,
      className,
      disabled,
      ...textareaProps
    },
    forwardedRef,
  ) => {
    const controlled = value !== undefined;
    const initialValue = useRef(
      normalizeRichTextValue(value ?? defaultValue ?? ""),
    );
    const hiddenTextarea = useRef<HTMLTextAreaElement>(null);
    const editorReference = useRef<ReturnType<typeof useEditor>>(null);
    const textReference = useRef(initialValue.current);
    const [textValue, setTextValue] = useState(initialValue.current);
    const [focused, setFocused] = useState(false);
    const [, setSelectionVersion] = useState(0);

    useImperativeHandle(forwardedRef, () => hiddenTextarea.current!, []);

    const focusNextField = () => {
      const textarea = hiddenTextarea.current;
      const editor = editorReference.current;
      const form = textarea?.form;
      if (!textarea || !editor || !form) {
        editor?.commands.blur();
        return;
      }
      const fields = Array.from(
        form.querySelectorAll<HTMLElement>(
          'textarea, input:not([type="hidden"]), select, [contenteditable="true"]',
        ),
      ).filter(
        (field) =>
          field !== editor.view.dom &&
          (!(
            field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement ||
            field instanceof HTMLSelectElement
          ) ||
            !field.disabled),
      );
      const index = fields.indexOf(textarea);
      const next = fields[index + 1];
      if (next) next.focus();
      else editor.commands.blur();
    };

    const editor = useEditor({
      content: markdownToHtml(initialValue.current),
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: {
            HTMLAttributes: { class: "my-2 list-disc pl-6" },
          },
          orderedList: {
            HTMLAttributes: { class: "my-2 list-decimal pl-6" },
          },
          listItem: {
            HTMLAttributes: { class: "my-1" },
          },
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
      ],
      editorProps: {
        attributes: {
          class:
            "ProseMirror min-h-[120px] px-4 py-2.5 text-sm leading-6 text-black outline-none dark:text-white",
          "aria-label":
            typeof textareaProps["aria-label"] === "string"
              ? textareaProps["aria-label"]
              : placeholder || "Rich text editor",
        },
        handleKeyDown: (_view, event) => {
          const currentEditor = editorReference.current;
          if (event.key === "Escape" && currentEditor?.isActive("bulletList")) {
            event.preventDefault();
            event.stopPropagation();
            focusNextField();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        const markdown = tiptapJsonToMarkdown(currentEditor.getJSON());
        textReference.current = markdown;
        setTextValue(markdown);
        const textarea = hiddenTextarea.current;
        if (!textarea) return;
        textarea.value = markdown;
        onChange?.({
          target: textarea,
          currentTarget: textarea,
        } as ChangeEvent<HTMLTextAreaElement>);
      },
      onFocus: () => setFocused(true),
      onBlur: ({ event }) => {
        setFocused(false);
        onBlur?.(event as unknown as React.FocusEvent<HTMLTextAreaElement>);
      },
      onSelectionUpdate: () => setSelectionVersion((current) => current + 1),
    });
    editorReference.current = editor;

    const syncEditor = (nextValue: unknown) => {
      const normalized = normalizeRichTextValue(nextValue);
      if (normalized === textReference.current) return;
      textReference.current = normalized;
      setTextValue(normalized);
      if (hiddenTextarea.current) hiddenTextarea.current.value = normalized;
      editor?.commands.setContent(markdownToHtml(normalized), {
        emitUpdate: false,
      });
    };

    useEffect(() => {
      if (controlled) syncEditor(value);
    }, [controlled, value]);

    useEffect(() => {
      editor?.setEditable(!disabled);
    }, [disabled, editor]);

    useEffect(() => {
      if (!editor) return;
      const checkExternalValue = () =>
        syncEditor(controlled ? value : (hiddenTextarea.current?.value ?? ""));
      const animationFrame = window.requestAnimationFrame(checkExternalValue);
      const interval = window.setInterval(checkExternalValue, 250);
      return () => {
        window.cancelAnimationFrame(animationFrame);
        window.clearInterval(interval);
      };
    }, [controlled, editor, value]);

    const inTaskList = editor?.isActive("taskList") ?? false;
    const inBulletList = editor?.isActive("bulletList") ?? false;
    const showListToolbar = focused && (inTaskList || inBulletList);
    const listItemType = inTaskList ? "taskItem" : "listItem";
    const retainSelection = (event: React.PointerEvent | React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <div
        className={`rich-textarea relative block min-h-[120px] w-full min-w-0 max-w-full cursor-text overflow-hidden rounded-lg border border-black/20 bg-white text-sm text-black shadow-sm transition focus-within:border-black/40 focus-within:ring-2 focus-within:ring-black/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:focus-within:border-white/50 dark:focus-within:ring-white/20 ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className ?? ""}`}
        onClick={() => {
          if (!disabled) editor?.commands.focus();
        }}
      >
        <textarea
          {...textareaProps}
          ref={hiddenTextarea}
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          defaultValue={initialValue.current}
          onChange={(event) => {
            syncEditor(event.currentTarget.value);
            onChange?.(event);
          }}
        />
        {!textValue && placeholder && (
          <span className="pointer-events-none absolute left-4 right-4 top-2.5 text-sm leading-6 text-black/70 dark:text-white/70">
            {placeholder}
          </span>
        )}
        <EditorContent
          editor={editor}
          className={showListToolbar ? "pb-0 sm:pb-3" : "pb-3"}
        />
        {showListToolbar && (
          <div
            className="relative z-20 mb-2 ml-auto mr-2 flex w-max items-center gap-0.5 rounded-full border border-zinc-700/80 bg-zinc-950/85 p-0.5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.28)] backdrop-blur sm:hidden"
            onPointerDown={retainSelection}
            onClick={retainSelection}
          >
            <button
              type="button"
              aria-label="Outdent list item"
              className="rounded-full p-2 hover:bg-white/10 disabled:opacity-40"
              onClick={() =>
                editor?.chain().focus().liftListItem(listItemType).run()
              }
            >
              <LuIndentDecrease />
            </button>
            <button
              type="button"
              aria-label="Indent list item"
              className="rounded-full p-2 hover:bg-white/10"
              onClick={() =>
                editor?.chain().focus().sinkListItem(listItemType).run()
              }
            >
              <LuIndentIncrease />
            </button>
            <button
              type="button"
              aria-label="Move to next field"
              className="rounded-full p-2 hover:bg-white/10"
              onClick={focusNextField}
            >
              <FiCornerDownRight />
            </button>
          </div>
        )}
      </div>
    );
  },
);

RichTextarea.displayName = "RichTextarea";

export { RichTextarea };
