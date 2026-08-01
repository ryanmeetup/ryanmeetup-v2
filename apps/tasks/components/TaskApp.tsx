"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Priority = "low" | "medium" | "high";
type Filter = "all" | "open" | "done";

type Task = {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  dueDate: string;
  createdAt: number;
};

const starterTasks: Task[] = [
  { id: "welcome-1", title: "Choose the three things that matter today", done: false, priority: "high", dueDate: "", createdAt: 3 },
  { id: "welcome-2", title: "Reply to the venue", done: false, priority: "medium", dueDate: "", createdAt: 2 },
  { id: "welcome-3", title: "Take a proper lunch break", done: true, priority: "low", dueDate: "", createdAt: 1 },
];

const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Done", value: "done" },
];

function formatDueDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

export function TaskApp() {
  const [tasks, setTasks] = useState<Task[]>(starterTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* Local storage is only available after the app mounts in the browser. */
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = window.localStorage.getItem("tasks.app.items");
    if (saved) {
      try {
        setTasks(JSON.parse(saved) as Task[]);
      } catch {
        window.localStorage.removeItem("tasks.app.items");
      }
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem("tasks.app.items", JSON.stringify(tasks));
  }, [ready, tasks]);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => filter === "all" || (filter === "done" ? task.done : !task.done))
      .sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
  }, [filter, tasks]);

  const openCount = tasks.filter((task) => !task.done).length;
  const doneCount = tasks.length - openCount;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setTasks((current) => [
      ...current,
      { id: crypto.randomUUID(), title: cleanTitle, done: false, priority, dueDate, createdAt: Date.now() },
    ]);
    setTitle("");
    setDueDate("");
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Tasks home">
          <span className="brand-mark" aria-hidden="true">✓</span>
          tasks
        </a>
        <div className="date-pill">
          {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
        </div>
      </header>

      <section className="workspace" id="top">
        <div className="intro">
          <p className="eyebrow">Your day, at a glance</p>
          <h1>Make room for<br /><em>what matters.</em></h1>
          <p className="intro-copy">A quiet place to collect your thoughts, choose your priorities, and make steady progress.</p>

          <div className="progress-card">
            <div className="progress-copy">
              <span>Today&apos;s progress</span>
              <strong>{progress}%</strong>
            </div>
            <div className="progress-track" aria-label={`${progress}% complete`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>{openCount === 0 ? "All clear. Nicely done." : `${openCount} ${openCount === 1 ? "task" : "tasks"} left to move forward.`}</p>
          </div>
        </div>

        <div className="task-panel">
          <form className="composer" onSubmit={addTask}>
            <label htmlFor="task-title">What needs doing?</label>
            <div className="title-row">
              <input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task…" autoComplete="off" />
              <button type="submit" className="add-button" aria-label="Add task">+</button>
            </div>
            <div className="task-options">
              <label>
                <span>Priority</span>
                <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                <span>Due date</span>
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </label>
            </div>
          </form>

          <div className="list-header">
            <div className="filters" aria-label="Filter tasks">
              {filters.map((item) => (
                <button key={item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>
                  {item.label}
                  <span>{item.value === "all" ? tasks.length : item.value === "open" ? openCount : doneCount}</span>
                </button>
              ))}
            </div>
            {doneCount > 0 && <button className="clear-button" onClick={() => setTasks((current) => current.filter((task) => !task.done))}>Clear done</button>}
          </div>

          <div className="task-list" aria-live="polite">
            {visibleTasks.length ? visibleTasks.map((task) => (
              <article className={`task ${task.done ? "is-done" : ""}`} key={task.id}>
                <button className="check" onClick={() => toggleTask(task.id)} aria-label={task.done ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}>
                  {task.done && "✓"}
                </button>
                <div className="task-copy">
                  <h2>{task.title}</h2>
                  <div className="meta">
                    <span className={`priority ${task.priority}`}>{task.priority}</span>
                    {task.dueDate && <span className="due">Due {formatDueDate(task.dueDate)}</span>}
                  </div>
                </div>
                <button className="delete" onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`}>×</button>
              </article>
            )) : (
              <div className="empty-state">
                <span>○</span>
                <h2>{filter === "done" ? "Nothing checked off yet" : "A beautifully clear list"}</h2>
                <p>{filter === "done" ? "Complete a task and it will show up here." : "Add something above when it comes to mind."}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer><span>Small steps count.</span><span>Saved on this device</span></footer>
    </main>
  );
}
