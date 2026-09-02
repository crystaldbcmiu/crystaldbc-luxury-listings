import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, Input, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useToast } from "@/components/ToastProvider";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { colors, statusColors } from "@/lib/theme";
import type { RentalRequest } from "@/types";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Declined", value: "Declined" },
];

const PAY_PERIOD_OPTIONS = [
  { label: "Day", value: "day" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export default function AdminRentalsScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<RentalRequest | null>(null);
  const [editForm, setEditForm] = useState({
    status: "Pending",
    payPeriod: "month",
    priceValue: "0",
    startDate: "",
    dueDate: "",
    endDate: "",
    notes: "",
  });

  const { data: requests = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["rental-requests"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ requests: RentalRequest[] }>("/rentals/requests");
      return data.requests;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiClient.put(`/rentals/requests/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rental-requests"] });
      toast({ title: t("admin.rentals.updated", "Request updated"), variant: "success" });
      setEditing(null);
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.rentals.updateFailed", "Update failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/rentals/requests/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rental-requests"] });
      toast({ title: t("admin.rentals.removed", "Request removed"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.rentals.deleteFailed", "Delete failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const filtered = useMemo(
    () => (statusFilter === "all" ? requests : requests.filter((request) => request.status === statusFilter)),
    [requests, statusFilter],
  );

  const openEdit = (request: RentalRequest) => {
    setEditing(request);
    setEditForm({
      status: request.status,
      payPeriod: request.payPeriod,
      priceValue: String(request.priceValue ?? 0),
      startDate: request.startDate ? request.startDate.slice(0, 10) : "",
      dueDate: request.dueDate ? request.dueDate.slice(0, 10) : "",
      endDate: request.endDate ? request.endDate.slice(0, 10) : "",
      notes: request.notes ?? "",
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    updateMutation.mutate({
      id: editing._id,
      payload: {
        status: editForm.status,
        payPeriod: editForm.payPeriod,
        priceValue: Number(editForm.priceValue) || 0,
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : undefined,
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : undefined,
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : undefined,
        notes: editForm.notes,
      },
    });
  };

  const confirmDelete = (request: RentalRequest) =>
    Alert.alert(t("admin.rentals.deleteTitle", "Delete request"), request.property?.title ?? "", [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      { text: t("common.delete", "Delete"), style: "destructive", onPress: () => deleteMutation.mutate(request._id) },
    ]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border p-4">
        <Select
          label={t("admin.rentals.filterByStatus", "Filter by status")}
          value={statusFilter}
          options={[{ label: t("common.all", "All"), value: "all" }, ...STATUS_OPTIONS]}
          onChange={setStatusFilter}
        />
      </View>

      <ScrollView contentContainerClassName="gap-3 p-4 pb-16">
        {filtered.length === 0 ? (
          <EmptyState title={t("admin.rentals.empty", "No rental requests")} />
        ) : (
          filtered.map((request) => (
            <Card key={request._id} className="gap-3">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text variant="heading" numberOfLines={1}>
                    {request.property?.title ?? "—"}
                  </Text>
                  <Muted className="text-xs">{request.property?.location}</Muted>
                </View>
                <Badge label={request.status} color={statusColors[request.status]} />
              </View>

              <View className="gap-1 border-t border-border pt-3">
                <View className="flex-row items-center gap-2">
                  <Glyph name="person-outline" size={14} color={colors.mutedForeground} />
                  <Muted className="flex-1 text-xs">
                    {request.user?.name} · {request.user?.email}
                  </Muted>
                </View>
                {request.user?.phone ? (
                  <View className="flex-row items-center gap-2">
                    <Glyph name="phone" size={15} color={colors.mutedForeground} />
                    <Muted className="flex-1 text-xs">{request.user.phone}</Muted>
                  </View>
                ) : null}
              </View>

              <View className="flex-row flex-wrap gap-y-2">
                <View className="w-1/2">
                  <Muted className="text-xs">{t("admin.rentals.price", "Price")}</Muted>
                  <Text variant="label">{formatCurrency(request.priceValue)}</Text>
                </View>
                <View className="w-1/2">
                  <Muted className="text-xs">{t("admin.rentals.payPeriod", "Pay period")}</Muted>
                  <Text variant="label">{request.payPeriod}</Text>
                </View>
                <View className="w-1/2">
                  <Muted className="text-xs">{t("admin.rentals.startDate", "Start")}</Muted>
                  <Text variant="label">{formatDate(request.startDate)}</Text>
                </View>
                <View className="w-1/2">
                  <Muted className="text-xs">{t("admin.rentals.dueDate", "Due")}</Muted>
                  <Text variant="label">{formatDate(request.dueDate)}</Text>
                </View>
              </View>

              {request.notes ? <Muted className="leading-5">{request.notes}</Muted> : null}
              <Muted className="text-xs">{formatDateTime(request.createdAt)}</Muted>

              <View className="flex-row gap-2">
                <Button
                  title={t("admin.rentals.approve", "Approve")}
                  size="sm"
                  className="flex-1"
                  disabled={request.status === "Approved"}
                  onPress={() => updateMutation.mutate({ id: request._id, payload: { status: "Approved" } })}
                />
                <Button
                  title={t("admin.rentals.decline", "Decline")}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  disabled={request.status === "Declined"}
                  onPress={() => updateMutation.mutate({ id: request._id, payload: { status: "Declined" } })}
                />
              </View>

              <View className="flex-row gap-2">
                <Button
                  title={t("common.edit", "Edit")}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => openEdit(request)}
                />
                <Button
                  title={t("common.delete", "Delete")}
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onPress={() => confirmDelete(request)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Edit sheet */}
      <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable className="flex-1 justify-end bg-black/70" onPress={() => setEditing(null)}>
          <View
            className="max-h-[85%] rounded-t-lg border-t border-border bg-card"
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text variant="heading">{t("admin.rentals.editTitle", "Edit request")}</Text>
              <Pressable accessibilityRole="button" onPress={() => setEditing(null)} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8" keyboardShouldPersistTaps="handled">
              <Select
                label={t("admin.rentals.status", "Status")}
                value={editForm.status}
                options={STATUS_OPTIONS}
                onChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
              />
              <Select
                label={t("admin.rentals.payPeriod", "Pay period")}
                value={editForm.payPeriod}
                options={PAY_PERIOD_OPTIONS}
                onChange={(value) => setEditForm((prev) => ({ ...prev, payPeriod: value }))}
              />
              <Input
                label={t("admin.rentals.price", "Price")}
                value={editForm.priceValue}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, priceValue: value }))}
                keyboardType="numeric"
              />
              <Input
                label={t("admin.rentals.startDate", "Start date")}
                value={editForm.startDate}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, startDate: value }))}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
              <Input
                label={t("admin.rentals.dueDate", "Due date")}
                value={editForm.dueDate}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, dueDate: value }))}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
              <Input
                label={t("admin.rentals.endDate", "End date")}
                value={editForm.endDate}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, endDate: value }))}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
              <Input
                label={t("admin.rentals.notes", "Notes")}
                value={editForm.notes}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, notes: value }))}
                multiline
                numberOfLines={3}
                className="h-20"
                textAlignVertical="top"
              />
              <Button
                title={t("common.saveChanges", "Save changes")}
                onPress={saveEdit}
                loading={updateMutation.isPending}
                size="lg"
                fullWidth
              />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
