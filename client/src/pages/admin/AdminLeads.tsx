import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import type { Lead } from "@/types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminGlassCard from "@/components/admin/AdminGlassCard";
import { Users2, Mail, Phone, UserRound, MessageCircle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const fetchLeads = async ({ search, status }: { search: string; status: string }) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status && status !== "all") params.set("status", status);
  const url = params.toString() ? `/leads?${params.toString()}` : "/leads";
  const { data } = await apiClient.get<{ leads: Lead[] }>(url);
  return data.leads;
};

const AdminLeads = () => {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const { data } = useQuery({ queryKey: ["leads", search, statusFilter], queryFn: () => fetchLeads({ search, status: statusFilter }) });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const canDelete = user?.role === "admin";

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiClient.put(`/leads/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: t("admin.leads.toasts.updated") });
    },
    onError: () => toast({ title: t("admin.leads.toasts.updateFailed"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: t("admin.leads.toasts.deleted") });
    },
    onError: () => toast({ title: t("admin.leads.toasts.deleteFailed"), variant: "destructive" }),
  });

  const statusStyles: Record<string, string> = {
    new: "bg-sky-500/10 text-sky-400",
    contacted: "bg-amber-500/10 text-amber-400",
    "in-progress": "bg-indigo-500/10 text-indigo-400",
    closed: "bg-emerald-500/10 text-emerald-400",
  };

  const formatStatus = (status: string) => {
    if (status === "in-progress") return t("admin.statuses.inProgress");
    return t(`admin.statuses.${status}`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Users2}
        title={t("admin.leads.title")}
        description={t("admin.leads.description")}
      />

      <AdminGlassCard
        eyebrow={t("admin.leads.eyebrow")}
        title={t("admin.leads.allTitle")}
        description={t("admin.leads.allDescription")}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="md:col-span-2 flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-2">
          <Input
            placeholder={t("admin.leads.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-[420px]"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">{t("admin.common.status")}</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder={t("admin.common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.common.all")}</SelectItem>
                <SelectItem value="new">{t("admin.statuses.new")}</SelectItem>
                <SelectItem value="contacted">{t("admin.statuses.contacted")}</SelectItem>
                <SelectItem value="in-progress">{t("admin.statuses.inProgress")}</SelectItem>
                <SelectItem value="closed">{t("admin.statuses.closed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {data?.map((lead) => (
          <div key={lead._id} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 transition hover:bg-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-display font-semibold text-white">{lead.fullName}</h3>
                <div className="mt-2 space-y-1 text-sm text-white/60">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="underline-offset-2 hover:text-white hover:underline"
                      aria-label={`Email ${lead.fullName}`}
                    >
                      {lead.email}
                    </a>
                  </div>
                  {lead.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {/* tel: hands off to the OS dialer — desktop browsers route
                          it to the default calling app, phones dial directly. */}
                      <a
                        href={`tel:${lead.phoneNumber.replace(/[^\d+]/g, "")}`}
                        className="underline-offset-2 hover:text-white hover:underline"
                        aria-label={`Call ${lead.fullName}`}
                      >
                        {lead.phoneNumber}
                      </a>
                    </div>
                  )}
                  {lead.interestedIn && (
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      <span className="capitalize">{lead.interestedIn}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[lead.status] ?? "bg-white/10 text-white/50"
                    }`}
                >
                  {formatStatus(lead.status)}
                </span>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      if (!window.confirm(t("admin.leads.confirmDelete"))) return;
                      deleteMutation.mutate(lead._id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {lead.message && (
              <p className="rounded-xl bg-black/20 p-3 text-sm text-white/70">
                <span className="inline-flex items-center gap-2 font-medium text-luxury-gold">
                  <MessageCircle className="h-4 w-4" />
                  {t("admin.leads.messageLabel")}
                </span>
                : {lead.message}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-white/50">{t("admin.common.status")}</label>
              <Select
                value={lead.status}
                onValueChange={(value) => updateMutation.mutate({ id: lead._id, status: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={t("admin.common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t("admin.statuses.new")}</SelectItem>
                  <SelectItem value="contacted">{t("admin.statuses.contacted")}</SelectItem>
                  <SelectItem value="in-progress">{t("admin.statuses.inProgress")}</SelectItem>
                  <SelectItem value="closed">{t("admin.statuses.closed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </AdminGlassCard>
    </div>
  );
};

export default AdminLeads;
