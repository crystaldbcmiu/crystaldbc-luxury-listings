import type { TFunction } from "i18next";
import type { ActivityLog } from "@/types";

/**
 * Shared logic with mobile/src/lib/activityDescription.ts — keep the two in sync.
 *
 * Turns a raw log row ("updated-property" + { title }) into something a person
 * can read at a glance. The server stores machine-friendly action slugs; this is
 * the single place that maps them to sentences, for both the list and any future
 * export. Unknown actions degrade to a de-slugged version of the action itself
 * rather than disappearing.
 */

export interface ActivityDescription {
  /** One-line summary, e.g. `Updated property "Riviera"`. */
  summary: string;
  /** Optional supporting line, e.g. `Status: Contacted`. */
  detail?: string;
  icon: "created" | "updated" | "deleted" | "other";
  /** "created" | "updated" | "deleted" | "other" — drives the accent colour. */
  tone: "created" | "updated" | "deleted" | "other";
}

const ENTITY_LABELS: Record<string, string> = {
  Property: "property",
  TrendingProject: "trending project",
  CMSSection: "CMS section",
  Lead: "lead",
  Message: "message",
  User: "user",
  Investment: "investment",
};

/** "updated-property" -> "Updated property". */
const humanizeAction = (action: string) => {
  const words = action.replace(/[-_]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const quoted = (value: unknown) => (typeof value === "string" && value.trim() ? `"${value.trim()}"` : "");

const metaString = (metadata: unknown, key: string): string | undefined => {
  if (!metadata || typeof metadata !== "object") return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const metaNumber = (metadata: unknown, key: string): number | undefined => {
  if (!metadata || typeof metadata !== "object") return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

export const describeActivity = (log: ActivityLog, t: TFunction): ActivityDescription => {
  const { action, entityType, metadata } = log;
  const entity = entityType ? ENTITY_LABELS[entityType] ?? entityType.toLowerCase() : "";

  // Most actions follow "<verb>-<thing>"; the label is whatever the entity was called.
  const name =
    metaString(metadata, "title") ??
    metaString(metadata, "name") ??
    metaString(metadata, "key") ??
    metaString(metadata, "email");

  const tone: ActivityDescription["tone"] = action.startsWith("created")
    ? "created"
    : action.startsWith("deleted")
      ? "deleted"
      : action.startsWith("updated")
        ? "updated"
        : "other";

  const icon: ActivityDescription["icon"] = tone;

  const details: string[] = [];
  const status = metaString(metadata, "status");
  if (status) details.push(`${t("admin.activity.fields.status", "Status")}: ${status}`);
  const role = metaString(metadata, "role");
  if (role) details.push(`${t("admin.activity.fields.role", "Role")}: ${role}`);
  const email = metaString(metadata, "email");
  if (email && email !== name) details.push(email);
  const amount = metaNumber(metadata, "additionalAmount");
  if (amount !== undefined) {
    details.push(`${t("admin.activity.fields.amount", "Amount")}: ${amount.toLocaleString()}`);
  }

  const summary = (() => {
    switch (action) {
      case "created-property":
        return t("admin.activity.actions.createdProperty", { name: quoted(name), defaultValue: `Added property ${quoted(name)}` });
      case "updated-property":
        return t("admin.activity.actions.updatedProperty", { name: quoted(name), defaultValue: `Edited property ${quoted(name)}` });
      case "deleted-property":
        return t("admin.activity.actions.deletedProperty", { name: quoted(name), defaultValue: `Deleted property ${quoted(name)}` });
      case "created-project":
        return t("admin.activity.actions.createdProject", { name: quoted(name), defaultValue: `Added trending project ${quoted(name)}` });
      case "updated-project":
        return t("admin.activity.actions.updatedProject", { name: quoted(name), defaultValue: `Edited trending project ${quoted(name)}` });
      case "deleted-project":
        return t("admin.activity.actions.deletedProject", { name: quoted(name), defaultValue: `Deleted trending project ${quoted(name)}` });
      case "updated-cms":
        return t("admin.activity.actions.updatedCms", { name: quoted(name), defaultValue: `Updated website content ${quoted(name)}` });
      case "updated-lead":
        return t("admin.activity.actions.updatedLead", { name: quoted(name), defaultValue: `Updated lead ${quoted(name)}`.trim() });
      case "deleted-lead":
        return t("admin.activity.actions.deletedLead", { name: quoted(name), defaultValue: `Deleted lead ${quoted(name)}`.trim() });
      case "updated-message":
        return t("admin.activity.actions.updatedMessage", { name: quoted(name), defaultValue: `Updated message ${quoted(name)}`.trim() });
      case "deleted-message":
        return t("admin.activity.actions.deletedMessage", { name: quoted(name), defaultValue: `Deleted message ${quoted(name)}`.trim() });
      case "created-user":
        return t("admin.activity.actions.createdUser", { name: quoted(name), defaultValue: `Created account ${quoted(name)}`.trim() });
      case "updated-user":
        return t("admin.activity.actions.updatedUser", { name: quoted(name), defaultValue: `Updated account ${quoted(name)}`.trim() });
      case "deleted-user":
        return t("admin.activity.actions.deletedUser", { name: quoted(name), defaultValue: `Removed account ${quoted(name)}`.trim() });
      case "deleted-own-account":
        return t("admin.activity.actions.deletedOwnAccount", { name: quoted(name), defaultValue: `Deleted their own account ${quoted(name)}`.trim() });
      case "requested-investment-increase":
        return t("admin.activity.actions.requestedIncrease", "Requested an investment increase");
      default:
        // Unknown slug: still readable, e.g. "Approved rental request".
        return entity ? `${humanizeAction(action)} (${entity})` : humanizeAction(action);
    }
  })();

  return { summary: summary.replace(/\s+/g, " ").trim(), detail: details.join(" · ") || undefined, icon, tone };
};

export default describeActivity;
