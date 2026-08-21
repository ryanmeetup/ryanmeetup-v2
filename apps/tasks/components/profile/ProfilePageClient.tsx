"use client";

import { useState } from "react";
import { Button, Heading, Modal } from "@ryanmeetup/ui";
import { FiLock } from "react-icons/fi";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "@/components/auth";
import { CategoriesModal } from "@/components/categories";
import { WorkspacePageShell } from "@/components/global";
import { ProjectsModal } from "@/components/projects";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

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
  const [passwordSaving, setPasswordSaving] = useState(false);
  const passwordFormId = "change-password-form";

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
              ? "Choose your sign-in password and confirm how your name appears before continuing."
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
          title="Change Password"
          hideActions
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={passwordSaving}
                onClick={() => setPasswordOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form={passwordFormId}
                leftIcon={<FiLock />}
                loading={passwordSaving}
                loadingText="Updating..."
              >
                Update password
              </Button>
            </div>
          }
        >
          <p className="mb-6 text-sm text-black/65 dark:text-white/65">
            Choose a new password for your account.
          </p>
          <PasswordForm
            email={email}
            formId={passwordFormId}
            hideSubmit
            onSavingChange={setPasswordSaving}
          />
        </Modal>
      )}
    </>
  );
}
