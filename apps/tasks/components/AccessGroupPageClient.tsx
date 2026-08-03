"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Card,
  ConfirmationDialog,
  DropdownSelect,
  IconButton,
  Input,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import { FiArrowLeft, FiMenu, FiTrash2 } from "react-icons/fi";
import { accessGroupSlug } from "@/lib/access-groups";
import { createClient } from "@/lib/supabase/client";
import type { WorkspaceData } from "@/lib/types";
import { TaskBanners } from "./TaskBanners";
import { ProjectsModal } from "./ProjectsModal";
import { TasksSidebar } from "./TasksSidebar";
import { TaskHeaderActions } from "./TaskHeaderActions";
import { WorkGroupsModal as CategoriesModal } from "./WorkGroupsModal";

type Permission = "viewer" | "editor" | "manager";
type AccessGroup = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type GroupMember = {
  group_id: string;
  profile_id: string;
  added_by: string;
  created_at: string;
};
type GroupGrant = {
  project_id: string;
  group_id: string;
  permission: Permission;
  granted_by: string;
};

export function AccessGroupPageClient({
  currentUserId,
  initialData,
  group: initialGroup,
  initialMembers,
  initialGrants,
}: {
  currentUserId: string;
  initialData: WorkspaceData;
  group: AccessGroup;
  initialMembers: GroupMember[];
  initialGrants: GroupGrant[];
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [group, setGroup] = useState(initialGroup);
  const [members, setMembers] = useState(initialMembers);
  const [grants, setGrants] = useState(initialGrants);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [memberId, setMemberId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [permission, setPermission] = useState<Permission>("viewer");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const projectNames = useMemo(
    () => new Map(data.projects.map((project) => [project.id, project.name])),
    [data.projects],
  );

  async function saveGroup(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { data: updated, error } = await createClient()
      .from("access_groups")
      .update({ name: name.trim(), description: description.trim() || null })
      .eq("id", group.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setGroup(updated);
    toast.success(`${updated.name} updated.`);
    const nextSlug = accessGroupSlug(updated.name);
    if (nextSlug !== accessGroupSlug(group.name))
      router.replace(`/access/${nextSlug}`);
  }

  async function addMember(profileId: string) {
    if (!profileId) return;
    setMemberId("");
    const { data: row, error } = await createClient()
      .from("access_group_members")
      .upsert({
        group_id: group.id,
        profile_id: profileId,
        added_by: currentUserId,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setMembers((current) => [
      ...current.filter((item) => item.profile_id !== profileId),
      row,
    ]);
  }
  async function removeMember(profileId: string) {
    const { error } = await createClient()
      .from("access_group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("profile_id", profileId);
    if (error) return toast.error(error.message);
    setMembers((current) =>
      current.filter((item) => item.profile_id !== profileId),
    );
  }
  async function addGrant(nextProjectId: string) {
    if (!nextProjectId) return;
    setProjectId("");
    const { data: row, error } = await createClient()
      .from("project_group_grants")
      .upsert({
        group_id: group.id,
        project_id: nextProjectId,
        permission,
        granted_by: currentUserId,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setGrants((current) => [
      ...current.filter((item) => item.project_id !== nextProjectId),
      row,
    ]);
  }
  async function removeGrant(nextProjectId: string) {
    const { error } = await createClient()
      .from("project_group_grants")
      .delete()
      .eq("group_id", group.id)
      .eq("project_id", nextProjectId);
    if (error) return toast.error(error.message);
    setGrants((current) =>
      current.filter((item) => item.project_id !== nextProjectId),
    );
  }
  async function deleteGroup() {
    const { error } = await createClient()
      .from("access_groups")
      .delete()
      .eq("id", group.id);
    if (error) return toast.error(error.message);
    router.push("/access");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar
        data={data}
        demoMode={false}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryCreateOpen(true)}
        onCreateProject={() => setProjectCreateOpen(true)}
      />
      <main className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-black/10 bg-[#f7f7f5]/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#101010]/90 sm:px-6 lg:px-8">
          <IconButton
            label="Open navigation"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu />
          </IconButton>
          <p className="truncate font-semibold">{group.name}</p>
          <TaskHeaderActions data={data} demoMode={false} />
        </header>
        <TaskBanners />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <Button.Link
              href="/access"
              variant="secondary"
              size="sm"
              leftIcon={<FiArrowLeft />}
            >
              Access groups
            </Button.Link>
            <form onSubmit={saveGroup}>
              <Card className="p-5">
                <div className="space-y-4">
                  <Input
                    label="Group name"
                    name="group-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    disabled={saving}
                  />
                  <Textarea
                    id="group-description"
                    label="Description"
                    name="group-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    disabled={saving}
                  />
                </div>
                <div className="mt-5 flex flex-col gap-4 border-t border-black/10 pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-black/70 dark:text-white/70">
                    Save details applies only to the group name and description.
                    Member and project visibility changes save automatically.
                  </p>
                  <Button
                    type="submit"
                    className="self-end sm:shrink-0"
                    loading={saving}
                    loadingText="Saving..."
                  >
                    Save details
                  </Button>
                </div>
              </Card>
            </form>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="flex min-h-[28rem] flex-col p-5">
                <h2 className="font-semibold">
                  Members{" "}
                  <span className="text-black/45 dark:text-white/45">
                    ({members.length})
                  </span>
                </h2>
                <div className="mt-4">
                  <DropdownSelect
                    label="Add member"
                    variant="field"
                    value={memberId}
                    onChange={(value) => void addMember(value)}
                    options={[
                      { label: "Select a person…", value: "" },
                      ...data.profiles
                        .filter(
                          (profile) =>
                            !members.some(
                              (member) => member.profile_id === profile.id,
                            ),
                        )
                        .map((profile) => ({
                          label: profile.full_name,
                          value: profile.id,
                          avatar: {
                            name: profile.full_name,
                            src: profile.avatar_url,
                          },
                        })),
                    ]}
                  />
                </div>
                <ul className="mt-3 max-h-72 flex-1 space-y-2 overflow-y-auto pr-1">
                  {members.map((member) => {
                    const profile = data.profiles.find(
                      (item) => item.id === member.profile_id,
                    );
                    return (
                      <li
                        key={member.profile_id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/5"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar
                            name={profile?.full_name ?? "Unknown user"}
                            src={profile?.avatar_url}
                            size="sm"
                          />
                          <span className="truncate">
                            {profile?.full_name ?? "Unknown user"}
                          </span>
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => removeMember(member.profile_id)}
                        >
                          Remove
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
              <Card className="flex min-h-[28rem] flex-col p-5">
                <h2 className="font-semibold">
                  Project visibility{" "}
                  <span className="text-black/45 dark:text-white/45">
                    ({grants.length})
                  </span>
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                  <DropdownSelect
                    label="Project"
                    variant="field"
                    value={projectId}
                    onChange={(value) => void addGrant(value)}
                    options={[
                      { label: "Select a project…", value: "" },
                      ...data.projects
                        .filter(
                          (project) =>
                            !grants.some(
                              (grant) => grant.project_id === project.id,
                            ),
                        )
                        .map((project) => ({
                          label: project.name,
                          value: project.id,
                        })),
                    ]}
                  />
                  <DropdownSelect
                    label="Permission"
                    variant="field"
                    value={permission}
                    onChange={(value) => setPermission(value as Permission)}
                    options={[
                      { label: "Viewer", value: "viewer" },
                      { label: "Editor", value: "editor" },
                      { label: "Manager", value: "manager" },
                    ]}
                  />
                </div>
                <ul className="mt-3 max-h-72 flex-1 space-y-2 overflow-y-auto pr-1">
                  {grants.map((grant) => (
                    <li
                      key={grant.project_id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/5"
                    >
                      <span>
                        {projectNames.get(grant.project_id) ??
                          "Unknown project"}{" "}
                        · <span className="capitalize">{grant.permission}</span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => removeGrant(grant.project_id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <Card className="flex items-center justify-between gap-4 border-red-500/25 p-5">
              <div>
                <h2 className="font-semibold">Delete access group</h2>
                <p className="mt-1 text-sm text-black/65 dark:text-white/65">
                  Members relying on this group may immediately lose project
                  access.
                </p>
              </div>
              <Button
                variant="danger"
                leftIcon={<FiTrash2 />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete group
              </Button>
            </Card>
          </div>
        </div>
      </main>
      {projectCreateOpen && (
        <ProjectsModal
          open
          setOpen={setProjectCreateOpen}
          data={data}
          setData={setData}
          demoMode={false}
          createOnly
        />
      )}
      {categoryCreateOpen && (
        <CategoriesModal
          open
          setOpen={setCategoryCreateOpen}
          data={data}
          setData={setData}
          demoMode={false}
          createOnly
        />
      )}
      <ConfirmationDialog
        open={deleteOpen}
        setOpen={setDeleteOpen}
        title="Delete access group?"
        description={`This removes ${group.name} and every project grant attached to it.`}
        confirmLabel="Delete group"
        destructive
        onConfirm={deleteGroup}
      />
    </div>
  );
}
