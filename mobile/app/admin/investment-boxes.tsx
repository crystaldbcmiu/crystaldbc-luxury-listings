import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, Input, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useToast } from "@/components/ToastProvider";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { formatDate, formatNumber } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { InvestmentBox } from "@/types";

const emptyForm = { name: "", description: "", roiPercentage: "0", minInvestmentAmount: "0", isActive: true };

export default function AdminInvestmentBoxesScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // /all returns inactive boxes too — admins need to see and re-enable them.
  const { data: boxes = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["investment-boxes", "all"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ boxes: InvestmentBox[] }>("/investment-boxes/all");
      return data.boxes;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description,
        roiPercentage: Number(form.roiPercentage) || 0,
        minInvestmentAmount: Number(form.minInvestmentAmount) || 0,
        isActive: form.isActive,
      };
      if (editingId) return apiClient.put(`/investment-boxes/${editingId}`, payload);
      return apiClient.post("/investment-boxes", payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investment-boxes"] });
      toast({
        title: editingId
          ? t("admin.investmentBoxes.updated", "Investment box updated")
          : t("admin.investmentBoxes.created", "Investment box created"),
        variant: "success",
      });
      closeForm();
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.investmentBoxes.saveFailed", "Save failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/investment-boxes/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investment-boxes"] });
      toast({ title: t("admin.investmentBoxes.removed", "Investment box removed"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.investmentBoxes.deleteFailed", "Delete failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (box: InvestmentBox) => {
    setEditingId(box._id);
    setForm({
      name: box.name,
      description: box.description ?? "",
      roiPercentage: String(box.roiPercentage ?? 0),
      minInvestmentAmount: String(box.minInvestmentAmount ?? 0),
      isActive: box.isActive !== false,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const confirmDelete = (box: InvestmentBox) =>
    Alert.alert(t("admin.investmentBoxes.deleteTitle", "Delete investment box"), box.name, [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      { text: t("common.delete", "Delete"), style: "destructive", onPress: () => deleteMutation.mutate(box._id) },
    ]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border p-4">
        <Button
          title={t("admin.investmentBoxes.create", "Add investment box")}
          onPress={openCreate}
          fullWidth
          leading={<Glyph name="add" size={20} color={colors.background} />}
        />
      </View>

      <ScrollView contentContainerClassName="gap-3 p-4 pb-16">
        {boxes.length === 0 ? (
          <EmptyState title={t("admin.investmentBoxes.empty", "No investment boxes")} />
        ) : (
          boxes.map((box) => (
            <Card key={box._id} className="gap-3">
              <View className="flex-row items-start justify-between gap-2">
                <Text variant="heading" className="flex-1">
                  {box.name}
                </Text>
                <Badge
                  label={box.isActive ? t("common.active", "Active") : t("common.inactive", "Inactive")}
                  color={box.isActive ? colors.success : colors.mutedForeground}
                />
              </View>

              {box.description ? <Muted className="leading-5">{box.description}</Muted> : null}

              <View className="flex-row justify-between border-t border-border pt-3">
                <View>
                  <Muted className="text-xs">{t("investment.roi", "ROI")}</Muted>
                  <Text className="font-semibold text-luxury-gold">{box.roiPercentage}%</Text>
                </View>
                <View className="items-end">
                  <Muted className="text-xs">{t("investment.minAmount", "Minimum")}</Muted>
                  <Text className="font-semibold">{formatNumber(box.minInvestmentAmount)}</Text>
                </View>
              </View>

              <Muted className="text-xs">{formatDate(box.createdAt)}</Muted>

              <View className="flex-row gap-2">
                <Button
                  title={t("common.edit", "Edit")}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => openEdit(box)}
                />
                <Button
                  title={t("common.delete", "Delete")}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onPress={() => confirmDelete(box)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={closeForm}>
        <Pressable className="flex-1 justify-end bg-black/70" onPress={closeForm}>
          <View className="rounded-t-lg border-t border-border bg-card" onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text variant="heading">
                {editingId
                  ? t("admin.investmentBoxes.editTitle", "Edit investment box")
                  : t("admin.investmentBoxes.createTitle", "New investment box")}
              </Text>
              <Pressable accessibilityRole="button" onPress={closeForm} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8" keyboardShouldPersistTaps="handled">
              <Input
                label={t("admin.investmentBoxes.fields.name", "Name")}
                value={form.name}
                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              />
              <Input
                label={t("admin.investmentBoxes.fields.description", "Description")}
                value={form.description}
                onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
                multiline
                numberOfLines={3}
                className="h-20"
                textAlignVertical="top"
              />
              <Input
                label={t("admin.investmentBoxes.fields.roi", "ROI %")}
                value={form.roiPercentage}
                onChangeText={(value) => setForm((prev) => ({ ...prev, roiPercentage: value }))}
                keyboardType="numeric"
              />
              <Input
                label={t("admin.investmentBoxes.fields.minAmount", "Minimum investment")}
                value={form.minInvestmentAmount}
                onChangeText={(value) => setForm((prev) => ({ ...prev, minInvestmentAmount: value }))}
                keyboardType="numeric"
              />
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: form.isActive }}
                onPress={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className="flex-row items-center gap-3 rounded-md border border-border bg-background p-3"
              >
                <Glyph
                  name={form.isActive ? "checkbox" : "square-outline"}
                  size={20}
                  color={form.isActive ? colors.gold : colors.mutedForeground}
                />
                <Text>{t("admin.investmentBoxes.fields.isActive", "Active")}</Text>
              </Pressable>

              <Button
                title={editingId ? t("common.saveChanges", "Save changes") : t("common.create", "Create")}
                onPress={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
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
