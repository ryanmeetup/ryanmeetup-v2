"use client";

import { useState } from "react";
import { Heading, IconButton, Modal } from "@ryanmeetup/ui";
import { FiSidebar } from "react-icons/fi";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "@/components/auth";
import { CategoriesModal } from "@/components/categories";
import { TaskBanners } from "@/components/global";
import {
  TaskHeaderActions,
  TaskHeaderBrand,
  TaskSearch,
  TasksSidebar,
} from "@/components/navigation";
import { ProjectsModal } from "@/components/projects";
import type { WorkspaceData } from "@/lib/types";

export function ProfilePageClient({
  initialData,
  email,
  onboardingRequired,
}: {
  initialData: WorkspaceData;
  email: string;
  onboardingRequired: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar
        data={data}
        demoMode={false}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryOpen(true)}
        onCreateProject={() => setProjectOpen(true)}
      />
      <main className="min-w-0 lg:pl-64">
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
          <TaskHeaderActions data={data} setData={setData} demoMode={false} />
        </header>
        <TaskBanners />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
              {onboardingRequired ? "Welcome" : "Your account"}
            </p>
            <Heading size="h1" className="mt-2 text-4xl">
              {onboardingRequired ? "Complete your profile" : "Profile"}
            </Heading>
            <p className="mt-2 text-sm text-black/65 dark:text-white/65">
              {onboardingRequired
                ? "Enter your first and last name before continuing to the workspace."
                : "Manage how teammates see you across the workspace."}
            </p>
            <div className="mt-10 border-t border-black/10 pt-8 dark:border-white/10">
              <ProfileForm
                profile={data.currentProfile}
                email={email}
                onboardingRequired={onboardingRequired}
                onChangePassword={() => setPasswordOpen(true)}
              />
            </div>
          </div>
        </div>
      </main>
      {categoryOpen && (
        <CategoriesModal
          open={categoryOpen}
          setOpen={setCategoryOpen}
          data={data}
          setData={setData}
          demoMode={false}
          createOnly
        />
      )}
      {projectOpen && (
        <ProjectsModal
          open={projectOpen}
          setOpen={setProjectOpen}
          data={data}
          setData={setData}
          demoMode={false}
          createOnly
        />
      )}
      {passwordOpen && (
        <Modal
          open={passwordOpen}
          setIsOpen={setPasswordOpen}
          title="Change password"
          hideActions
        >
          <p className="mb-6 text-sm text-black/65 dark:text-white/65">
            Choose a new password for your account.
          </p>
          <PasswordForm email={email} />
        </Modal>
      )}
    </div>
  );
}
