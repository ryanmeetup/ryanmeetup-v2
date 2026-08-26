"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { IconButton } from "@ryanmeetup/ui";
import { FiSidebar } from "react-icons/fi";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import {
  TaskHeaderActions,
  TaskHeaderBrand,
  TaskSearch,
  TasksSidebar,
} from "@/components/navigation";
import { TaskBanners } from "./TaskBanners";

type WorkspaceShellRegistration = {
  id: symbol;
  data: WorkspaceData;
  demoMode: boolean;
  onCreateCategory?: () => void;
  onCreateProject?: () => void;
  onNewTask?: () => void;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
};

type PersistentShellContextValue = {
  register: (registration: WorkspaceShellRegistration) => void;
  unregister: (id: symbol) => void;
};

const PersistentShellContext =
  createContext<PersistentShellContextValue | null>(null);

type WorkspacePageShellProps = {
  children: ReactNode;
  contentClassName?: string;
  data: WorkspaceData;
  demoMode: boolean;
  onCreateCategory?: () => void;
  onCreateProject?: () => void;
  onNewTask?: () => void;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
};

function WorkspaceChrome({
  children,
  contentClassName,
  data,
  demoMode,
  onCreateCategory,
  onCreateProject,
  onNewTask,
  setData,
  setSidebarOpen,
  sidebarOpen,
}: WorkspacePageShellProps) {
  return (
    <div
      data-workspace-shell
      className="min-h-screen bg-[#f1f2ef] text-black dark:bg-[#101010] dark:text-white"
    >
      <TasksSidebar
        data={data}
        demoMode={demoMode}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={onCreateCategory ?? (() => undefined)}
        onCreateProject={onCreateProject ?? (() => undefined)}
      />
      <main className="min-w-0 overflow-x-clip lg:pl-64">
        <header className="tasks-app-header">
          <IconButton
            label="Open navigation"
            tooltipTriggerClassName="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiSidebar />
          </IconButton>
          <TaskHeaderBrand />
          <TaskSearch
            tasks={data.tasks}
            projects={data.projects}
            categories={data.categories}
            statuses={data.statuses}
            profiles={data.profiles}
          />
          <TaskHeaderActions
            data={data}
            setData={setData}
            demoMode={demoMode}
            onNewTask={onNewTask}
          />
        </header>
        <div className="hidden h-16 lg:block" aria-hidden="true" />
        <TaskBanners demoMode={demoMode} preview={data.accessPreview} />
        <div className={contentClassName}>{children}</div>
      </main>
    </div>
  );
}

export function WorkspacePageShell(props: WorkspacePageShellProps) {
  const persistentShell = useContext(PersistentShellContext);
  const registrationId = useRef(Symbol("workspace-shell-page"));
  const {
    children,
    contentClassName,
    data,
    demoMode,
    onCreateCategory,
    onCreateProject,
    onNewTask,
    setData,
  } = props;

  useLayoutEffect(() => {
    if (!persistentShell) return;
    const id = registrationId.current;
    persistentShell.register({
      id,
      data,
      demoMode,
      onCreateCategory,
      onCreateProject,
      onNewTask,
      setData,
    });
    return () => persistentShell.unregister(id);
  }, [
    data,
    demoMode,
    onCreateCategory,
    onCreateProject,
    onNewTask,
    persistentShell,
    setData,
  ]);

  if (persistentShell) {
    return <div className={contentClassName}>{children}</div>;
  }

  return <WorkspaceChrome {...props} />;
}

export function PersistentWorkspaceShell({
  children,
  initialData,
  demoMode,
}: {
  children: ReactNode;
  initialData: WorkspaceData;
  demoMode: boolean;
}) {
  const workspace = useWorkspaceData(initialData, demoMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [registration, setRegistration] =
    useState<WorkspaceShellRegistration | null>(null);
  const context = useMemo<PersistentShellContextValue>(
    () => ({
      register: setRegistration,
      unregister: (id) =>
        setRegistration((current) =>
          current?.id === id ? null : current,
        ),
    }),
    [],
  );
  const activeWorkspace = registration ?? workspace;

  return (
    <PersistentShellContext.Provider value={context}>
      <WorkspaceChrome
        data={activeWorkspace.data}
        setData={activeWorkspace.setData}
        demoMode={registration?.demoMode ?? demoMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onCreateCategory={registration?.onCreateCategory}
        onCreateProject={registration?.onCreateProject}
        onNewTask={registration?.onNewTask}
      >
        {children}
      </WorkspaceChrome>
    </PersistentShellContext.Provider>
  );
}
