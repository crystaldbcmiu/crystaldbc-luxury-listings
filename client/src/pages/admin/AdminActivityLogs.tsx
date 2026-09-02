import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import AdminGlassCard from "@/components/admin/AdminGlassCard";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { ClipboardList, ShieldCheck, Search, PlusCircle, Pencil, Trash2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fetchActivityLogs } from "@/lib/activityLogs";
import { describeActivity } from "@/lib/activityDescription";

const formatDate = (value: string) => new Date(value).toLocaleString();

/** Matches the tone the log descriptor assigns: additions green, removals red. */
const TONE_ICONS = {
  created: { Icon: PlusCircle, className: "text-emerald-400" },
  updated: { Icon: Pencil, className: "text-luxury-gold" },
  deleted: { Icon: Trash2, className: "text-red-400" },
  other: { Icon: Zap, className: "text-white/50" },
} as const;

const AdminActivityLogs = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs", { search: debouncedSearch }],
    queryFn: () => fetchActivityLogs({ search: debouncedSearch || undefined }),
  });

  const logs = data?.logs ?? [];

  if (isLoading) {
    return <p className="text-muted-foreground">{t("admin.activityLogs.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={ClipboardList}
        title={t("admin.activityLogs.headerTitle")}
        description={t("admin.activityLogs.headerDescription")}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("admin.activityLogs.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("admin.activityLogs.showing", { current: logs.length, total: data?.total ?? logs.length })}
        </p>
      </div>

      {!logs.length ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
          <p className="text-white/40">{t("admin.activityLogs.noResults")}</p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-sm text-luxury-gold hover:underline"
            >
              {t("admin.activityLogs.clearSearch")}
            </button>
          )}
        </div>
      ) : (
        <AdminGlassCard title={t("admin.activityLogs.recentActivity")} description={t("admin.activityLogs.recentActivityDesc")}>
          <div className="space-y-4 mt-4">
            {logs.map((log) => (
              <div key={log._id} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2 transition hover:bg-white/10">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                      <ShieldCheck className="h-5 w-5 text-luxury-gold" />
                    </span>
                    <div>
                      <p className="font-semibold text-white">{log.user?.name ?? t("admin.activityLogs.system")}</p>
                      <p className="text-sm text-white/50">{log.user?.email ?? "-"}</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/40">{formatDate(log.createdAt)}</p>
                </div>
                {(() => {
                  const described = describeActivity(log, t);
                  const { Icon, className } = TONE_ICONS[described.icon];
                  return (
                    <>
                      <p className="text-white/90 font-medium flex items-center gap-2">
                        <Icon className={`h-4 w-4 shrink-0 ${className}`} />
                        <span>{described.summary}</span>
                      </p>
                      {described.detail && <p className="text-sm text-white/60">{described.detail}</p>}
                    </>
                  );
                })()}
                <p className="text-xs text-white/40">
                  {log.entityType ? `${log.entityType} • ${log.entityId ?? "—"}` : t("admin.activityLogs.general")}
                </p>
              </div>
            ))}
          </div>
        </AdminGlassCard>
      )}
    </div>
  );
};

export default AdminActivityLogs;
