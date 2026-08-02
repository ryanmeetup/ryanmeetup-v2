import { Fragment } from "react";
import {
  inlineMarkdownToHtml,
  normalizeRichTextValue,
  parseListLine,
} from "./richTextMarkdown";

export type FormattedTextProps = {
  text: string;
  className?: string;
  onChange?: (value: string) => void;
};

const bullets = ["•", "◦", "▪", "▫"];

const FormattedText = ({ text, className, onChange }: FormattedTextProps) => {
  const normalized = normalizeRichTextValue(text);
  const lines = normalized.split("\n");

  return (
    <div className={className}>
      {lines.map((line, index) => {
        if (/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line))
          return (
            <hr
              key={index}
              className="my-3 border-0 border-t border-zinc-600"
            />
          );
        const listItem = parseListLine(line);
        if (listItem) {
          const taskMatch = line.match(/\[([ xX])\]/);
          const task = Boolean(taskMatch);
          const checked = taskMatch?.[1].toLowerCase() === "x";
          const marker = task
            ? null
            : /^\s*\d+\./.test(line)
              ? line.match(/^\s*(\d+\.)/)?.[1]
              : bullets[listItem.depth % bullets.length];
          return (
            <div
              key={index}
              className="flex items-start gap-2"
              style={{ paddingLeft: `${listItem.depth * 1.25}rem` }}
            >
              {task ? (
                onChange ? (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = [...lines];
                      next[index] = line.replace(
                        /\[[ xX]\]/,
                        checked ? "[ ]" : "[x]",
                      );
                      onChange(next.join("\n"));
                    }}
                    className="mt-1 h-4 w-4 accent-zinc-100"
                  />
                ) : (
                  <span
                    aria-hidden
                    className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                      checked
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-black/50 dark:border-white/50"
                    }`}
                  >
                    {checked ? "✓" : ""}
                  </span>
                )
              ) : (
                <span aria-hidden className="w-4 shrink-0 text-center">
                  {marker}
                </span>
              )}
              <span
                className={
                  checked ? "text-black/50 line-through dark:text-white/50" : ""
                }
                dangerouslySetInnerHTML={{
                  __html: inlineMarkdownToHtml(listItem.text),
                }}
              />
            </div>
          );
        }
        return (
          <Fragment key={index}>
            <span
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: inlineMarkdownToHtml(line) }}
            />
            {index < lines.length - 1 && <br />}
          </Fragment>
        );
      })}
    </div>
  );
};

export { FormattedText };
