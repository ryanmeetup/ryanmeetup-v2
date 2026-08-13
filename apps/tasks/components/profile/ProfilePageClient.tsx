"use client";

import { useState } from "react";
import { Heading, Modal } from "@ryanmeetup/ui";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "@/components/auth";
import { CategoriesModal } from "@/components/categories";
import { WorkspacePageShell } from "@/components/global";
import { ProjectsModal } from "@/components/projects";
import type { WorkspaceData } from "@/lib/workspace-types";

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
    <>
      <WorkspacePageShell
        data={data}
        demoMode={false}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryOpen(true)}
        onCreateProject={() => setProjectOpen(true)}
        setData={setData}
        contentClassName="p-4 sm:p-6 lg:p-8"
      >
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
      </WorkspacePageShell>
      {categoryOpen && (
        <CategoriesModal
          modal={{ open: categoryOpen, setOpen: setCategoryOpen }}
          workspace={{ data, setData, demoMode: false }}
          options={{ createOnly: true }}
        />
      )}
      {projectOpen && (
        <ProjectsModal
          modal={{ open: projectOpen, setOpen: setProjectOpen }}
          workspace={{ data, setData, demoMode: false }}
          options={{ createOnly: true }}
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
    </>
  );
}
