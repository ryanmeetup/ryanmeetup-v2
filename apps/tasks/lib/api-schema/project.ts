import {
  defaultProjectStatus,
  isProjectStatus,
} from "@/lib/resources/project-status";
import { projectLinks } from "./resource-links";
import {
  objectWithKeys,
  optionalTrimmedText,
  parseUuid,
  requiredTrimmedText,
  uuidList,
} from "./shared";

export function projectCreateSchema(value: unknown) {
  const body = objectWithKeys(value, [
    "name",
    "description",
    "links",
    "ownerIds",
    "accessMode",
    "accessGroupIds",
    "status",
  ]);
  if (!body) return null;
  const name = requiredTrimmedText(body.name, 100);
  const description = optionalTrimmedText(body.description, 1000);
  const links = projectLinks(body.links ?? []);
  const ownerIds = uuidList(body.ownerIds ?? []);
  const accessMode =
    body.accessMode === "owners" ||
    body.accessMode === "open" ||
    body.accessMode === "restricted"
      ? body.accessMode
      : null;
  const accessGroupIds = uuidList(body.accessGroupIds ?? []);
  const status = body.status ?? defaultProjectStatus;
  return name &&
    description &&
    links &&
    ownerIds?.length &&
    accessMode &&
    accessGroupIds &&
    isProjectStatus(status) &&
    (accessMode !== "restricted" || accessGroupIds.length > 0)
    ? { name, description, links, ownerIds, accessMode, accessGroupIds, status }
    : null;
}

export function projectPatchSchema(value: unknown) {
  const body = objectWithKeys(value, [
    "id",
    "name",
    "description",
    "links",
    "archived",
    "ownerIds",
    "status",
  ]);
  if (!body) return null;
  const id = parseUuid(body.id);
  const name =
    body.name === undefined ? undefined : requiredTrimmedText(body.name, 100);
  const description = optionalTrimmedText(body.description, 1000);
  const links = body.links === undefined ? undefined : projectLinks(body.links);
  const ownerIds =
    body.ownerIds === undefined ? undefined : uuidList(body.ownerIds);
  const status = body.status === undefined ? undefined : body.status;
  if (
    !id ||
    name === null ||
    description === null ||
    links === null ||
    ownerIds === null ||
    (status !== undefined && !isProjectStatus(status)) ||
    (description !== undefined && !description) ||
    (ownerIds !== undefined && ownerIds.length === 0) ||
    (body.archived !== undefined && typeof body.archived !== "boolean")
  )
    return null;
  return {
    id,
    name,
    description,
    links,
    archived: body.archived as boolean | undefined,
    ownerIds,
    status,
  };
}
