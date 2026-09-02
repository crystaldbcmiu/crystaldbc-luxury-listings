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
import type { ContactMessage } from "@/types";

const STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Responded", value: "responded" },
  { label: "Archived", value: "archived" },
];

const STATUS_COLORS: Record<string, string> = {
  new: colors.gold,
  responded: colors.success,
  archived: colors.mutedForeground,
};

export default function AdminMessagesScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useRoles();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: messages = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ messages: ContactMessage[] }>("/messages");
      return data.messages;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiClient.patch(`/messages/${id}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast({ title: t("admin.messages.updated", "Message updated"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.messages.updateFailed", "Update failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/messages/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast({ title: t("admin.messages.removed", "Message removed"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.messages.deleteFailed", "Delete failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const filtered = useMemo(
    () => (statusFilter === "all" ? messages : messages.filter((message) => message.status === statusFilter)),
    [messages, statusFilter],
  );

  const confirmDelete = (message: ContactMessage) =>
    Alert.alert(t("admin.messages.deleteTitle", "Delete message"), message.name, [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      { text: t("common.delete", "Delete"), style: "destructive", onPress: () => deleteMutation.mutate(message._id) },
    ]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border p-4">
        <Select
          label={t("admin.messages.filterByStatus", "Filter by status")}
          value={statusFilter}
          options={[{ label: t("common.all", "All"), value: "all" }, ...STATUS_OPTIONS]}
          onChange={setStatusFilter}
        />
      </View>

      <ScrollView contentContainerClassName="gap-3 p-4 pb-16">
        {filtered.length === 0 ? (
          <EmptyState title={t("admin.messages.empty", "No messages yet")} />
        ) : (
          filtered.map((message) => (
            <Card key={message._id} className="gap-3">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text variant="heading">{message.name}</Text>
                  <Muted className="text-xs">{formatDateTime(message.createdAt)}</Muted>
                </View>
                <Badge label={message.status} color={STATUS_COLORS[message.status] ?? colors.mutedForeground} />
              </View>

              <View className="gap-1">
                <View className="flex-row items-center gap-2">
                  <Glyph name="admin-mail" size={14} color={colors.mutedForeground} />
                  <Muted className="flex-1 text-xs">{message.email}</Muted>
                </View>
                {message.phone ? (
                  <View className="flex-row items-center gap-2">
                    <Glyph name="phone" size={15} color={colors.mutedForeground} />
                    <Muted className="flex-1 text-xs">{message.phone}</Muted>
                  </View>
                ) : null}
                <View className="flex-row items-center gap-2">
                  <Glyph name="document" size={15} color={colors.mutedForeground} />
                  <Muted className="flex-1 text-xs">{message.page}</Muted>
                </View>
              </View>

              <Muted className="leading-5">{message.message}</Muted>

              <Select
                label={t("admin.messages.status", "Status")}
                value={message.status}
                options={STATUS_OPTIONS}
                onChange={(status) => updateMutation.mutate({ id: message._id, status })}
              />

              <View className="flex-row gap-2">
                <Button
                  title={t("admin.messages.reply", "Reply")}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => Linking.openURL(`mailto:${message.email}`)}
                />
                {isAdmin ? (
                  <Button
                    title={t("common.delete", "Delete")}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onPress={() => confirmDelete(message)}
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
