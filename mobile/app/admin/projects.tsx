import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Card, Input, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useToast } from "@/components/ToastProvider";
import useProperties from "@/hooks/useProperties";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { pickAndUploadImages } from "@/lib/uploadImage";
import { getMediaUrl } from "@/lib/media";
import { colors } from "@/lib/theme";
import type { TrendingProject } from "@/types";

const emptyForm = {
  name: "",
  location: "",
  image: "",
  status: "Presale",
  description: "",
  amenities: "",
  completion: "",
  startingPrice: "",
  developer: "",
  property: "",
};

export default function AdminProjectsScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: projects = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ projects: TrendingProject[] }>("/projects");
      return data.projects;
    },
  });

  const { data: properties = [] } = useProperties();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        location: form.location,
        image: form.image,
        status: form.status,
        description: form.description,
        amenities: form.amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((name) => ({ name })),
        completion: form.completion,
        startingPrice: form.startingPrice,
        developer: form.developer,
        property: form.property || undefined,
      };

      if (editingId) return apiClient.put(`/projects/${editingId}`, payload);
      return apiClient.post("/projects", payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: editingId ? t("admin.projects.updated", "Project updated") : t("admin.projects.created", "Project created"),
        variant: "success",
      });
      closeForm();
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.projects.saveFailed", "Save failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/projects/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: t("admin.projects.removed", "Project removed"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.projects.deleteFailed", "Delete failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (project: TrendingProject) => {
    setEditingId(project._id);
    setForm({
      name: project.name,
      location: project.location,
      image: project.image,
      status: project.status ?? "Presale",
      description: project.description,
      amenities: (project.amenities ?? []).map((item) => item.name).join(", "),
      completion: project.completion,
      startingPrice: project.startingPrice,
      developer: project.developer,
      property: project.property?._id ?? "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const urls = await pickAndUploadImages();
      if (urls[0]) setForm((prev) => ({ ...prev, image: urls[0] }));
    } catch (uploadError) {
      toast({
        title: t("admin.projects.uploadFailed", "Upload failed"),
        description: getApiErrorMessage(uploadError),
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (project: TrendingProject) =>
    Alert.alert(t("admin.projects.deleteTitle", "Delete project"), project.name, [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      { text: t("common.delete", "Delete"), style: "destructive", onPress: () => deleteMutation.mutate(project._id) },
    ]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border p-4">
        <Button
          title={t("admin.projects.create", "Add project")}
          onPress={openCreate}
          fullWidth
          leading={<Glyph name="add" size={20} color={colors.background} />}
        />
      </View>

      <ScrollView contentContainerClassName="gap-3 p-4 pb-16">
        {projects.length === 0 ? (
          <EmptyState title={t("admin.projects.empty", "No trending projects")} />
        ) : (
          projects.map((project) => {
            const image = getMediaUrl(project.image);
            return (
              <Card key={project._id} className="gap-3 p-0">
                <View className="h-32 overflow-hidden rounded-t-lg bg-muted">
                  {image ? (
                    <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  ) : null}
                </View>
                <View className="gap-1 px-4">
                  <Text variant="heading">{project.name}</Text>
                  <Muted className="text-xs">{project.location}</Muted>
                  <Text className="text-sm font-semibold text-luxury-gold">{project.startingPrice}</Text>
                  <Muted className="text-xs">
                    {project.developer} · {project.completion} · {project.status}
                  </Muted>
                </View>
                <View className="flex-row gap-2 border-t border-border p-3">
                  <Button
                    title={t("common.edit", "Edit")}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={() => openEdit(project)}
                  />
                  <Button
                    title={t("common.delete", "Delete")}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onPress={() => confirmDelete(project)}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={closeForm}>
        <Pressable className="flex-1 justify-end bg-black/70" onPress={closeForm}>
          <View
            className="max-h-[88%] rounded-t-lg border-t border-border bg-card"
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text variant="heading">
                {editingId ? t("admin.projects.editTitle", "Edit project") : t("admin.projects.createTitle", "New project")}
              </Text>
              <Pressable accessibilityRole="button" onPress={closeForm} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8" keyboardShouldPersistTaps="handled">
              <Input
                label={t("admin.projects.fields.name", "Name")}
                value={form.name}
                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              />
              <Input
                label={t("admin.projects.fields.location", "Location")}
                value={form.location}
                onChangeText={(value) => setForm((prev) => ({ ...prev, location: value }))}
              />

              <View className="gap-2">
                <Text variant="label">{t("admin.projects.fields.image", "Image")}</Text>
                {form.image ? (
                  <View className="h-36 overflow-hidden rounded-md border border-border bg-muted">
                    <Image source={{ uri: getMediaUrl(form.image) }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  </View>
                ) : null}
                <Button
                  title={t("admin.projects.upload", "Upload image")}
                  variant="outline"
                  loading={uploading}
                  onPress={handleUpload}
                  leading={<Glyph name="admin-upload" size={16} color={colors.gold} />}
                />
                <Input
                  value={form.image}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, image: value }))}
                  placeholder={t("admin.properties.imageUrlPlaceholder", "Or paste an image URL")}
                  autoCapitalize="none"
                />
              </View>

              <Input
                label={t("admin.projects.fields.status", "Status")}
                value={form.status}
                onChangeText={(value) => setForm((prev) => ({ ...prev, status: value }))}
              />
              <Input
                label={t("admin.projects.fields.description", "Description")}
                value={form.description}
                onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
                multiline
                numberOfLines={4}
                className="h-24"
                textAlignVertical="top"
              />
              <Input
                label={t("admin.projects.fields.amenities", "Amenities")}
                value={form.amenities}
                onChangeText={(value) => setForm((prev) => ({ ...prev, amenities: value }))}
                hint={t("admin.properties.fields.featuresHint", "Comma separated")}
              />
              <Input
                label={t("admin.projects.fields.completion", "Completion")}
                value={form.completion}
                onChangeText={(value) => setForm((prev) => ({ ...prev, completion: value }))}
              />
              <Input
                label={t("admin.projects.fields.startingPrice", "Starting price")}
                value={form.startingPrice}
                onChangeText={(value) => setForm((prev) => ({ ...prev, startingPrice: value }))}
              />
              <Input
                label={t("admin.projects.fields.developer", "Developer")}
                value={form.developer}
                onChangeText={(value) => setForm((prev) => ({ ...prev, developer: value }))}
              />
              <Select
                label={t("admin.projects.fields.linkedProperty", "Linked property")}
                placeholder={t("common.none", "None")}
                value={form.property}
                options={[
                  { label: t("common.none", "None"), value: "" },
                  ...properties.map((property) => ({ label: property.title, value: property._id })),
                ]}
                onChange={(value) => setForm((prev) => ({ ...prev, property: value }))}
              />

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
