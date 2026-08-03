"use client";

import { useState } from "react";
import { Button, Heading, IconButton, Modal } from "@ryanmeetup/ui";
import { FiLock, FiMenu } from "react-icons/fi";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { ProjectsModal } from "./ProjectsModal";
import { WorkGroupsModal as CategoriesModal } from "./WorkGroupsModal";
import { TasksSidebar } from "./TasksSidebar";
import { TeamSettingsModal } from "./TaskApp";
import { ThemeToggle } from "./ThemeToggle";
import { BetaBanner } from "./BetaBanner";
import type { WorkspaceData } from "@/lib/types";

export function ProfilePageClient({ initialData, email, onboardingRequired }: { initialData: WorkspaceData; email: string; onboardingRequired: boolean }) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar data={data} demoMode={false} open={sidebarOpen} setOpen={setSidebarOpen} onCreateCategory={() => setCategoryOpen(true)} onCreateProject={() => setProjectOpen(true)} onTeamSettings={() => setSettingsOpen(true)} />
      <main className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-black/10 bg-[#f7f7f5]/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#101010]/90 sm:px-6 lg:px-8">
          <IconButton label="Open navigation" className="lg:hidden" onClick={() => setSidebarOpen(true)}><FiMenu /></IconButton>
          <p className="font-semibold">Profile</p>
          <span className="ml-auto"><ThemeToggle /></span>
        </header>
        <BetaBanner />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">{onboardingRequired ? "Welcome" : "Your account"}</p>
            <Heading size="h1" className="mt-2 text-4xl">{onboardingRequired ? "Complete your profile" : "Profile"}</Heading>
            <p className="mt-2 text-sm text-black/65 dark:text-white/65">{onboardingRequired ? "Enter your first and last name before continuing to the workspace." : "Manage how teammates see you across the workspace."}</p>
            <div className="mt-10 border-t border-black/10 pt-8 dark:border-white/10"><ProfileForm profile={data.currentProfile} email={email} onboardingRequired={onboardingRequired} /></div>
            {!onboardingRequired && (
              <section className="mt-10 border-t border-black/10 pt-8 dark:border-white/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Heading size="h2" className="text-2xl">Password</Heading>
                    <p className="mt-2 text-sm text-black/65 dark:text-white/65">Update the password used to sign in to your account.</p>
                  </div>
                  <Button variant="secondary" leftIcon={<FiLock />} onClick={() => setPasswordOpen(true)}>Change password</Button>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
      {categoryOpen && <CategoriesModal open={categoryOpen} setOpen={setCategoryOpen} data={data} setData={setData} demoMode={false} createOnly />}
      {projectOpen && <ProjectsModal open={projectOpen} setOpen={setProjectOpen} data={data} setData={setData} demoMode={false} createOnly />}
      {passwordOpen && (
        <Modal open={passwordOpen} setIsOpen={setPasswordOpen} title="Change password" hideActions>
          <p className="mb-6 text-sm text-black/65 dark:text-white/65">Choose a new password for your account.</p>
          <PasswordForm email={email} />
        </Modal>
      )}
      <TeamSettingsModal open={settingsOpen} setOpen={setSettingsOpen} data={data} setData={setData} demoMode={false} />
    </div>
  );
}
