import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, Input, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import StatCard from "@/components/admin/StatCard";
import { useToast } from "@/components/ToastProvider";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { formatCurrency, formatDate } from "@/lib/format";
import { colors, statusColors } from "@/lib/theme";
import type { Investment } from "@/types";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const PAYMENT_OPTIONS = [
  { label: "Not Paid", value: "Not Paid" },
  { label: "Partially Paid", value: "Partially Paid" },
  { label: "Paid", value: "Paid" },
];

export default function AdminInvestmentsScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [editing, setEditing] = useState<Investment | null>(null);
  const [editForm, setEditForm] = useState({ investmentAmount: "", roiPercentage: "", amountReceived: "", notes: "", payoutDate: "" });
  const [paymentTarget, setPaymentTarget] = useState<Investment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const { data: investments = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["investments", search, statusFilter, paymentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
      const query = params.toString();
      const { data } = await apiClient.get<{ investments: Investment[] }>(
        query ? `/investments?${query}` : "/investments",
      );
      return data.investments;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiClient.put(`/investments/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast({ title: t("admin.investments.updated", "Investment updated"), variant: "success" });
      setEditing(null);
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.investments.updateFailed", "Update failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      apiClient.post(`/investments/${id}/payments`, { amount }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast({ title: t("admin.investments.paymentAdded", "Payment recorded"), variant: "success" });
      setPaymentTarget(null);
      setPaymentAmount("");
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.investments.paymentFailed", "Payment failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "Approved" | "Rejected" }) =>
      apiClient.post(`/investments/${id}/increase-request/review`, { decision }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast({ title: t("admin.investments.reviewed", "Request reviewed"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.investments.reviewFailed", "Review failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/investments/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast({ title: t("admin.investments.removed", "Investment removed"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.investments.deleteFailed", "Delete failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const totals = useMemo(
    () =>
      investments.reduce(
        (acc, investment) => {
          if (investment.status === "Pending") acc.pending += 1;
          if (investment.status === "Approved") acc.approved += 1;
          if (investment.status === "Rejected") acc.rejected += 1;
          if (investment.paymentStatus === "Paid") acc.paid += 1;
          acc.invested += investment.investmentAmount || 0;
          acc.received += investment.amountReceived || 0;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0, paid: 0, invested: 0, received: 0 },
      ),
    [investments],
  );

  const openEdit = (investment: Investment) => {
    setEditing(investment);
    setEditForm({
      investmentAmount: String(investment.investmentAmount ?? 0),
      roiPercentage: String(investment.roiPercentage ?? 0),
      amountReceived: String(investment.amountReceived ?? 0),
      notes: investment.notes ?? "",
      payoutDate: investment.payoutDate ? investment.payoutDate.slice(0, 10) : "",
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    updateMutation.mutate({
      id: editing._id,
      payload: {
        investmentAmount: Number(editForm.investmentAmount) || 0,
        roiPercentage: Number(editForm.roiPercentage) || 0,
        amountReceived: Number(editForm.amountReceived) || 0,
        notes: editForm.notes,
        payoutDate: editForm.payoutDate ? new Date(editForm.payoutDate).toISOString() : undefined,
      },
    });
  };

  const confirmDelete = (investment: Investment) =>
    Alert.alert(
      t("admin.investments.deleteTitle", "Delete investment"),
      investment.user?.name ?? investment.investmentBox?.name ?? "",
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        { text: t("common.delete", "Delete"), style: "destructive", onPress: () => deleteMutation.mutate(investment._id) },
      ],
    );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 border-b border-border p-4">
        <Input value={search} onChangeText={setSearch} placeholder={t("admin.investments.search", "Search investor")} />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Select
              value={statusFilter}
              options={[{ label: t("common.all", "All statuses"), value: "all" }, ...STATUS_OPTIONS]}
              onChange={setStatusFilter}
            />
          </View>
          <View className="flex-1">
            <Select
              value={paymentFilter}
              options={[{ label: t("common.all", "All payments"), value: "all" }, ...PAYMENT_OPTIONS]}
              onChange={setPaymentFilter}
            />
          </View>
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-3 p-4 pb-16">
        <View className="flex-row flex-wrap gap-3">
          <StatCard label={t("admin.investments.totalInvested", "Invested")} value={formatCurrency(totals.invested)} accent />
          <StatCard label={t("admin.investments.totalReceived", "Received")} value={formatCurrency(totals.received)} />
          <StatCard label={t("admin.investments.pending", "Pending")} value={totals.pending} />
          <StatCard label={t("admin.investments.approved", "Approved")} value={totals.approved} />
        </View>

        {investments.length === 0 ? (
          <EmptyState title={t("admin.investments.empty", "No investments found")} />
        ) : (
          investments.map((investment) => {
            const increasePending = investment.increaseRequest?.status === "Pending";
            return (
              <Card key={investment._id} className="gap-3">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text variant="heading" numberOfLines={1}>
                      {investment.user?.name ?? "—"}
                    </Text>
                    <Muted className="text-xs">{investment.user?.email}</Muted>
                    <Muted className="text-xs">
                      {investment.investmentBox?.name ?? investment.property?.title ?? "—"}
                    </Muted>
                  </View>
                  <Badge label={investment.status} color={statusColors[investment.status]} />
                </View>

                <View className="flex-row flex-wrap gap-y-2 border-t border-border pt-3">
                  <View className="w-1/2">
                    <Muted className="text-xs">{t("myInvestments.labels.investmentAmount", "Amount")}</Muted>
                    <Text variant="label">{formatCurrency(investment.investmentAmount)}</Text>
                  </View>
                  <View className="w-1/2">
                    <Muted className="text-xs">{t("investment.roi", "ROI")}</Muted>
                    <Text variant="label">{investment.roiPercentage}%</Text>
                  </View>
                  <View className="w-1/2">
                    <Muted className="text-xs">{t("myInvestments.labels.received", "Received")}</Muted>
                    <Text variant="label">{formatCurrency(investment.amountReceived)}</Text>
                  </View>
                  <View className="w-1/2">
                    <Muted className="text-xs">{t("myInvestments.labels.expectedProfit", "Expected profit")}</Muted>
                    <Text variant="label">{formatCurrency(investment.expectedProfit)}</Text>
                  </View>
                  {investment.payoutDate ? (
                    <View className="w-1/2">
                      <Muted className="text-xs">{t("myInvestments.labels.payoutDate", "Payout")}</Muted>
                      <Text variant="label">{formatDate(investment.payoutDate)}</Text>
                    </View>
                  ) : null}
                </View>

                {increasePending ? (
                  <View className="gap-2 rounded-md border border-luxury-gold/40 bg-luxury-gold/10 p-3">
                    <Muted className="text-xs">
                      {t("admin.investments.increaseRequested", "Increase requested")}:{" "}
                      {formatCurrency(investment.increaseRequest?.additionalAmount)}
                    </Muted>
                    {investment.increaseRequest?.note ? (
                      <Muted className="text-xs">{investment.increaseRequest.note}</Muted>
                    ) : null}
                    <View className="flex-row gap-2">
                      <Button
                        title={t("common.approve", "Approve")}
                        size="sm"
                        className="flex-1"
                        onPress={() => reviewMutation.mutate({ id: investment._id, decision: "Approved" })}
                      />
                      <Button
                        title={t("common.reject", "Reject")}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onPress={() => reviewMutation.mutate({ id: investment._id, decision: "Rejected" })}
                      />
                    </View>
                  </View>
                ) : null}

                <Select
                  label={t("admin.investments.status", "Status")}
                  value={investment.status}
                  options={STATUS_OPTIONS}
                  onChange={(status) => updateMutation.mutate({ id: investment._id, payload: { status } })}
                />
                <Select
                  label={t("admin.investments.paymentStatus", "Payment status")}
                  value={investment.paymentStatus}
                  options={PAYMENT_OPTIONS}
                  onChange={(paymentStatus) => updateMutation.mutate({ id: investment._id, payload: { paymentStatus } })}
                />

                <View className="flex-row gap-2">
                  <Button
                    title={t("admin.investments.addPayment", "Add payment")}
                    size="sm"
                    className="flex-1"
                    onPress={() => {
                      setPaymentTarget(investment);
                      setPaymentAmount("");
                    }}
                  />
                  <Button
                    title={t("common.edit", "Edit")}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={() => openEdit(investment)}
                  />
                  <Button
                    title={t("common.delete", "Delete")}
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onPress={() => confirmDelete(investment)}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Edit sheet */}
      <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable className="flex-1 justify-end bg-black/70" onPress={() => setEditing(null)}>
          <View className="max-h-[85%] rounded-t-lg border-t border-border bg-card" onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text variant="heading">{t("admin.investments.editTitle", "Edit investment")}</Text>
              <Pressable accessibilityRole="button" onPress={() => setEditing(null)} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8" keyboardShouldPersistTaps="handled">
              <Input
                label={t("myInvestments.labels.investmentAmount", "Investment amount")}
                value={editForm.investmentAmount}
                onChangeText={(v) => setEditForm((prev) => ({ ...prev, investmentAmount: v }))}
                keyboardType="numeric"
              />
              <Input
                label={t("investment.roi", "ROI %")}
                value={editForm.roiPercentage}
                onChangeText={(v) => setEditForm((prev) => ({ ...prev, roiPercentage: v }))}
                keyboardType="numeric"
              />
              <Input
                label={t("myInvestments.labels.received", "Amount received")}
                value={editForm.amountReceived}
                onChangeText={(v) => setEditForm((prev) => ({ ...prev, amountReceived: v }))}
                keyboardType="numeric"
              />
              <Input
                label={t("myInvestments.labels.payoutDate", "Payout date")}
                value={editForm.payoutDate}
                onChangeText={(v) => setEditForm((prev) => ({ ...prev, payoutDate: v }))}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
              <Input
                label={t("myInvestments.labels.notes", "Notes")}
                value={editForm.notes}
                onChangeText={(v) => setEditForm((prev) => ({ ...prev, notes: v }))}
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

      {/* Payment sheet */}
      <Modal
        visible={Boolean(paymentTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentTarget(null)}
      >
        <Pressable className="flex-1 justify-end bg-black/70" onPress={() => setPaymentTarget(null)}>
          <View className="rounded-t-lg border-t border-border bg-card" onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text variant="heading">{t("admin.investments.addPayment", "Add payment")}</Text>
              <Pressable accessibilityRole="button" onPress={() => setPaymentTarget(null)} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <View className="gap-4 px-4 py-4 pb-8">
              <Muted className="text-xs">
                {paymentTarget?.user?.name} · {formatCurrency(paymentTarget?.amountReceived)}{" "}
                {t("admin.investments.receivedSoFar", "received so far")}
              </Muted>
              <Input
                label={t("admin.investments.paymentAmount", "Payment amount")}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
              />
              <Button
                title={t("admin.investments.recordPayment", "Record payment")}
                loading={paymentMutation.isPending}
                size="lg"
                fullWidth
                onPress={() => {
                  const amount = Number(paymentAmount);
                  if (!Number.isFinite(amount) || amount <= 0) {
                    toast({ title: t("investment.invalidAmount", "Enter a valid amount"), variant: "error" });
                    return;
                  }
                  if (paymentTarget) paymentMutation.mutate({ id: paymentTarget._id, amount });
                }}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
