import { useMemo, useState } from "react";
import { Alert, Linking, ScrollView, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useToast } from "@/components/ToastProvider";
import useRoles from "@/hooks/useRoles";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { Lead } from "@/types";

const STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "In progress", value: "in-progress" },
  { label: "Closed", value: "closed" },
];

const STATUS_COLORS: Record<string, string> = {
  new: colors.gold,
  contacted: colors.warning,
  "in-progress": colors.warning,
  closed: colors.success,
};

export default function AdminLeadsScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useRoles();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: leads = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ leads: Lead[] }>("/leads");
      return data.leads;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiClient.put(`/leads/${id}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: t("admin.leads.updated", "Lead updated"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.leads.updateFailed", "Update failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/leads/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: t("admin.leads.removed", "Lead removed"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.leads.deleteFailed", "Delete failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const filtered = useMemo(
    () => (statusFilter === "all" ? leads : leads.filter((lead) => lead.status === statusFilter)),
    [leads, statusFilter],
  );

  const confirmDelete = (lead: Lead) =>
    Alert.alert(t("admin.leads.deleteTitle", "Delete lead"), lead.fullName, [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      { text: t("common.delete", "Delete"), style: "destructive", onPress: () => deleteMutation.mutate(lead._id) },
    ]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border p-4">
        <Select
          label={t("admin.leads.filterByStatus", "Filter by status")}
          value={statusFilter}
          options={[{ label: t("common.all", "All"), value: "all" }, ...STATUS_OPTIONS]}
          onChange={setStatusFilter}
        />
      </View>

      <ScrollView contentContainerClassName="gap-3 p-4 pb-16">
        {filtered.length === 0 ? (
          <EmptyState title={t("admin.leads.empty", "No leads yet")} />
        ) : (
          filtered.map((lead) => (
            <Card key={lead._id} className="gap-3">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text variant="heading">{lead.fullName}</Text>
                  <Muted className="text-xs">{formatDateTime(lead.createdAt)}</Muted>
                </View>
                <Badge label={lead.status} color={STATUS_COLORS[lead.status] ?? colors.mutedForeground} />
              </View>

              <View className="gap-1">
                <View className="flex-row items-center gap-2">
                  <Glyph name="admin-mail" size={14} color={colors.mutedForeground} />
                  <Muted className="flex-1 text-xs">{lead.email}</Muted>
                </View>
                {lead.phoneNumber ? (
                  <View className="flex-row items-center gap-2">
                    <Glyph name="phone" size={15} color={colors.mutedForeground} />
                    <Muted className="flex-1 text-xs">{lead.phoneNumber}</Muted>
                  </View>
                ) : null}
                {lead.interestedIn ? (
                  <View className="flex-row items-center gap-2">
                    <Glyph name="pricetag-outline" size={14} color={colors.mutedForeground} />
                    <Muted className="flex-1 text-xs">{lead.interestedIn}</Muted>
                  </View>
                ) : null}
                <View className="flex-row items-center gap-2">
                  <Glyph name="git-branch-outline" size={14} color={colors.mutedForeground} />
                  <Muted className="flex-1 text-xs">{lead.source}</Muted>
                </View>
              </View>

              {lead.message ? <Muted className="leading-5">{lead.message}</Muted> : null}
              {lead.property ? (
                <Muted className="text-xs">
                  {t("admin.leads.property", "Property")}: {lead.property.title}
                </Muted>
              ) : null}

              <Select
                label={t("admin.leads.status", "Status")}
                value={lead.status}
                options={STATUS_OPTIONS}
                onChange={(status) => updateMutation.mutate({ id: lead._id, status })}
              />

              <View className="flex-row gap-2">
                <Button
                  title={t("admin.leads.email", "Email")}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => Linking.openURL(`mailto:${lead.email}`)}
                />
                {lead.phoneNumber ? (
                  <Button
                    title={t("admin.leads.call", "Call")}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={() => Linking.openURL(`tel:${lead.phoneNumber?.replace(/[^\d+]/g, "")}`)}
                  />
                ) : null}
                {isAdmin ? (
                  <Button
                    title={t("common.delete", "Delete")}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onPress={() => confirmDelete(lead)}
                  />
                ) : null}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
