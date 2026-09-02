import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, Input, ModalScreen, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useToast } from "@/components/ToastProvider";
import useRoles from "@/hooks/useRoles";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { pickAndUploadImages } from "@/lib/uploadImage";
import { getMediaUrl } from "@/lib/media";
import { AMENITIES, splitAmenities } from "@/lib/amenities";
import { colors } from "@/lib/theme";
import type { Property } from "@/types";

const initialFormState = {
  title: "",
  location: "",
  latitude: "",
  longitude: "",
  currencyCode: "EGP",
  priceLabel: "EGP 0",
  priceValue: "0",
  beds: "0",
  baths: "0",
  sqftLabel: "",
  sqftValue: "0",
  coverImage: "",
  gallery: [] as string[],
  description: "",
  /** Catalogue selections, stored by label. */
  amenities: [] as string[],
  /** Free-text extras that are not in the catalogue. */
  features: "",
  type: "",
  status: "For Sale",
  constructionStatus: "Finished Construction",
  companyName: "",
  phone: "",
  virtualTourEmbedUrl: "",
  rentPayPeriod: "month",
  isFeatured: false,
};

type FormState = typeof initialFormState;

const STATUS_OPTIONS = [
  { label: "For Sale", value: "For Sale" },
  { label: "For Rent", value: "For Rent" },
];
const CONSTRUCTION_OPTIONS = [
  { label: "Finished Construction", value: "Finished Construction" },
  { label: "Under Construction", value: "Under Construction" },
];
const CURRENCY_OPTIONS = [
  { value: "EGP", label: "EGP (Egypt)" },
  { value: "SAR", label: "SAR (Saudi Arabia)" },
  { value: "EUR", label: "EUR (Germany)" },
  { value: "AED", label: "AED (UAE)" },
  { value: "RUB", label: "RUB (Russia)" },
];
const RENT_PAY_PERIOD_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const formatPriceLabel = (currencyCode: string, priceValue: number) => {
  const rounded = Number.isFinite(priceValue) ? Math.round(priceValue) : 0;
  return `${currencyCode} ${rounded.toLocaleString()}`;
};

export default function AdminPropertiesScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isPropertyHandler } = useRoles();

  // Web restricts delete to admins even though the API also allows property-handler.
  const canDelete = isAdmin;
  // POST /uploads/image is admin+employee only, so property handlers paste URLs.
  const canUpload = !isPropertyHandler;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [uploading, setUploading] = useState<"cover" | "gallery" | null>(null);
  const [search, setSearch] = useState("");

  const { data: properties = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ properties: Property[] }>("/properties");
      return data.properties;
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return properties;
    return properties.filter(
      (property) =>
        property.title.toLowerCase().includes(term) || property.location.toLowerCase().includes(term),
    );
  }, [properties, search]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Keep priceLabel derived, as the web form does.
      if (field === "priceValue") {
        next.priceLabel = formatPriceLabel(prev.currencyCode, Number(value));
      }
      if (field === "currencyCode") {
        next.priceLabel = formatPriceLabel(String(value), Number(prev.priceValue));
      }
      return next;
    });

  const selectedAmenities = form.amenities;
  const toggleAmenity = (label: string) =>
    setForm((previous) => ({
      ...previous,
      amenities: previous.amenities.includes(label)
        ? previous.amenities.filter((item) => item !== label)
        : [...previous.amenities, label],
    }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        location: form.location,
        // Empty strings clear the pin; the API rejects anything non-numeric.
        latitude: form.latitude.trim() === "" ? null : Number(form.latitude),
        longitude: form.longitude.trim() === "" ? null : Number(form.longitude),
        currencyCode: form.currencyCode,
        priceLabel: form.priceLabel,
        priceValue: Number(form.priceValue) || 0,
        beds: Number(form.beds) || 0,
        baths: Number(form.baths) || 0,
        sqftLabel: form.sqftLabel,
        sqftValue: Number(form.sqftValue) || 0,
        coverImage: form.coverImage,
        gallery: form.gallery,
        description: form.description,
        features: [
          ...form.amenities,
          ...form.features.split(",").map((item) => item.trim()).filter(Boolean),
        ],
        type: form.type,
        status: form.status,
        constructionStatus: form.constructionStatus,
        companyName: form.companyName,
        phone: form.phone,
        virtualTourEmbedUrl: form.virtualTourEmbedUrl,
        rentPayPeriod: form.rentPayPeriod,
        isFeatured: form.isFeatured,
      };

      if (editingId) return apiClient.put(`/properties/${editingId}`, payload);
      return apiClient.post("/properties", payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({
        title: editingId
          ? t("admin.properties.toasts.updated", "Property updated")
          : t("admin.properties.toasts.created", "Property created"),
        variant: "success",
      });
      closeForm();
    },
    onError: (mutationError) => {
      toast({
        title: t("admin.properties.toasts.operationFailed", "Operation failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/properties/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: t("admin.properties.toasts.removed", "Property removed"), variant: "success" });
    },
    onError: (mutationError) => {
      toast({
        title: t("admin.properties.toasts.deleteFailed", "Delete failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(initialFormState);
    setFormOpen(true);
  };

  const openEdit = (property: Property) => {
    setEditingId(property._id);
    setForm({
      title: property.title,
      location: property.location,
      latitude: property.latitude == null ? "" : String(property.latitude),
      longitude: property.longitude == null ? "" : String(property.longitude),
      currencyCode: property.currencyCode ?? "EGP",
      priceLabel: property.priceLabel,
      priceValue: String(property.priceValue ?? 0),
      beds: String(property.beds ?? 0),
      baths: String(property.baths ?? 0),
      sqftLabel: property.sqftLabel ?? "",
      sqftValue: String(property.sqftValue ?? 0),
      coverImage: property.coverImage ?? "",
      gallery: property.gallery ?? [],
      description: property.description ?? "",
      amenities: splitAmenities(property.features ?? []).selected,
      features: splitAmenities(property.features ?? []).custom.join(", "),
      type: property.type ?? "",
      status: property.status ?? "For Sale",
      constructionStatus: property.constructionStatus ?? "Finished Construction",
      companyName: property.companyName ?? "",
      phone: property.phone ?? "",
      virtualTourEmbedUrl: property.virtualTourEmbedUrl ?? "",
      rentPayPeriod: property.rentPayPeriod ?? "month",
      isFeatured: property.isFeatured ?? false,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(initialFormState);
  };

  const handleUpload = async (target: "cover" | "gallery") => {
    setUploading(target);
    try {
      const urls = await pickAndUploadImages({ multiple: target === "gallery" });
      if (urls.length === 0) return;

      if (target === "cover") {
        setField("coverImage", urls[0]);
      } else {
        setField("gallery", [...form.gallery, ...urls]);
      }
    } catch (uploadError) {
      toast({
        title: t("admin.properties.toasts.uploadFailed", "Upload failed"),
        description: getApiErrorMessage(uploadError),
        variant: "error",
      });
    } finally {
      setUploading(null);
    }
  };

  const confirmDelete = (property: Property) => {
    Alert.alert(
      t("admin.properties.deleteTitle", "Delete property"),
      t("admin.properties.deleteConfirm", { title: property.title, defaultValue: `Delete "${property.title}"?` }),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(property._id),
        },
      ],
    );
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 border-b border-border p-4">
        <Input value={search} onChangeText={setSearch} placeholder={t("admin.properties.search", "Search properties")} />
        <Button
          title={t("admin.properties.create", "Add property")}
          onPress={openCreate}
          fullWidth
          leading={<Glyph name="add" size={20} color={colors.background} />}
        />
      </View>

      <ScrollView contentContainerClassName="gap-3 p-4 pb-16">
        {filtered.length === 0 ? (
          <EmptyState title={t("admin.properties.empty", "No properties found")} />
        ) : (
          filtered.map((property) => {
            const image = getMediaUrl(property.coverImage);
            return (
              <Card key={property._id} className="gap-3 p-0">
                <View className="flex-row">
                  <View className="h-24 w-24 overflow-hidden rounded-l-lg bg-muted">
                    {image ? (
                      <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    ) : null}
                  </View>
                  <View className="flex-1 gap-1 p-3">
                    <Text variant="label" numberOfLines={1}>
                      {property.title}
                    </Text>
                    <Muted numberOfLines={1} className="text-xs">
                      {property.location}
                    </Muted>
                    <Text className="text-sm font-semibold text-luxury-gold">{property.priceLabel}</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      <Badge label={property.status} color={colors.gold} />
                      {property.isFeatured ? <Badge label={t("admin.properties.featured", "Featured")} /> : null}
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-2 border-t border-border p-3">
                  <Button
                    title={t("common.edit", "Edit")}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={() => openEdit(property)}
                  />
                  {canDelete ? (
                    <Button
                      title={t("common.delete", "Delete")}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      loading={deleteMutation.isPending}
                      onPress={() => confirmDelete(property)}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Create / edit form */}
      <Modal visible={formOpen} animationType="slide" onRequestClose={closeForm}>
        <ModalScreen>
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text variant="heading">
              {editingId
                ? t("admin.properties.editTitle", "Edit property")
                : t("admin.properties.createTitle", "New property")}
            </Text>
            <Pressable accessibilityRole="button" onPress={closeForm} hitSlop={10}>
              <Glyph name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-4 p-4 pb-12" keyboardShouldPersistTaps="handled">
            <Input label={t("admin.properties.fields.title", "Title")} value={form.title} onChangeText={(v) => setField("title", v)} />
            <Input label={t("admin.properties.fields.location", "Location")} value={form.location} onChangeText={(v) => setField("location", v)} />
            <Input label={t("admin.properties.fields.type", "Type")} value={form.type} onChangeText={(v) => setField("type", v)} />

            {/* Map pin. Properties without both values never appear on the map tab. */}
            <View className="flex-row gap-3">
              <Input
                containerClassName="flex-1"
                label={t("admin.properties.fields.latitude", "Latitude")}
                value={form.latitude}
                onChangeText={(v) => setField("latitude", v)}
                keyboardType="numbers-and-punctuation"
                placeholder="30.0444"
                hint={t("admin.properties.fields.coordinatesHint", "Leave blank to hide from the map")}
              />
              <Input
                containerClassName="flex-1"
                label={t("admin.properties.fields.longitude", "Longitude")}
                value={form.longitude}
                onChangeText={(v) => setField("longitude", v)}
                keyboardType="numbers-and-punctuation"
                placeholder="31.2357"
              />
            </View>

            <Select
              label={t("admin.properties.fields.currency", "Currency")}
              value={form.currencyCode}
              options={CURRENCY_OPTIONS}
              onChange={(v) => setField("currencyCode", v)}
            />

            <Input
              label={t("admin.properties.fields.priceValue", "Price value")}
              value={form.priceValue}
              onChangeText={(v) => setField("priceValue", v)}
              keyboardType="numeric"
              hint={`${t("admin.properties.fields.priceLabel", "Label")}: ${form.priceLabel}`}
            />

            <View className="flex-row gap-3">
              <Input
                containerClassName="flex-1"
                label={t("admin.properties.fields.beds", "Beds")}
                value={form.beds}
                onChangeText={(v) => setField("beds", v)}
                keyboardType="numeric"
              />
              <Input
                containerClassName="flex-1"
                label={t("admin.properties.fields.baths", "Baths")}
                value={form.baths}
                onChangeText={(v) => setField("baths", v)}
                keyboardType="numeric"
              />
            </View>

            <View className="flex-row gap-3">
              <Input
                containerClassName="flex-1"
                label={t("admin.properties.fields.sqftLabel", "Area label")}
                value={form.sqftLabel}
                onChangeText={(v) => setField("sqftLabel", v)}
              />
              <Input
                containerClassName="flex-1"
                label={t("admin.properties.fields.sqftValue", "Area value")}
                value={form.sqftValue}
                onChangeText={(v) => setField("sqftValue", v)}
                keyboardType="numeric"
              />
            </View>

            <Select
              label={t("admin.properties.fields.status", "Status")}
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(v) => setField("status", v)}
            />

            {form.status === "For Sale" ? (
              <Select
                label={t("admin.properties.fields.constructionStatus", "Construction status")}
                value={form.constructionStatus}
                options={CONSTRUCTION_OPTIONS}
                onChange={(v) => setField("constructionStatus", v)}
              />
            ) : (
              <Select
                label={t("admin.properties.fields.rentPayPeriod", "Rent pay period")}
                value={form.rentPayPeriod}
                options={RENT_PAY_PERIOD_OPTIONS}
                onChange={(v) => setField("rentPayPeriod", v)}
              />
            )}

            {/* Cover image */}
            <View className="gap-2">
              <Text variant="label">{t("admin.properties.fields.coverImage", "Cover image")}</Text>
              {form.coverImage ? (
                <View className="h-40 overflow-hidden rounded-md border border-border bg-muted">
                  <Image
                    source={{ uri: getMediaUrl(form.coverImage) }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>
              ) : null}
              {canUpload ? (
                <Button
                  title={t("admin.properties.uploadCover", "Upload cover image")}
                  variant="outline"
                  loading={uploading === "cover"}
                  onPress={() => handleUpload("cover")}
                  leading={<Glyph name="admin-upload" size={16} color={colors.gold} />}
                />
              ) : null}
              <Input
                value={form.coverImage}
                onChangeText={(v) => setField("coverImage", v)}
                placeholder={t("admin.properties.imageUrlPlaceholder", "Or paste an image URL")}
                autoCapitalize="none"
              />
            </View>

            {/* Gallery */}
            <View className="gap-2">
              <Text variant="label">{t("admin.properties.fields.gallery", "Gallery")}</Text>
              {form.gallery.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                  {form.gallery.map((item, index) => (
                    <View key={`${item}-${index}`} className="h-24 w-24 overflow-hidden rounded-md border border-border bg-muted">
                      <Image source={{ uri: getMediaUrl(item) }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("common.remove", "Remove")}
                        onPress={() => setField("gallery", form.gallery.filter((_, i) => i !== index))}
                        className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-background/90"
                      >
                        <Glyph name="close" size={14} color={colors.destructive} />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
              {canUpload ? (
                <Button
                  title={t("admin.properties.uploadGallery", "Add gallery images")}
                  variant="outline"
                  loading={uploading === "gallery"}
                  onPress={() => handleUpload("gallery")}
                  leading={<Glyph name="images-outline" size={16} color={colors.gold} />}
                />
              ) : null}
            </View>

            <Input
              label={t("admin.properties.fields.description", "Description")}
              value={form.description}
              onChangeText={(v) => setField("description", v)}
              multiline
              numberOfLines={5}
              className="h-32"
              textAlignVertical="top"
            />

            {/* Amenity picker. Selections are stored as labels in `features`,
                so anything typed in before this existed still round-trips. */}
            <View className="gap-2">
              <Text variant="label">{t("admin.properties.fields.amenities", "Amenities")}</Text>
              <Muted className="text-xs">
                {t("admin.properties.fields.amenitiesHint", "Tap everything this property has.")}
              </Muted>
              <View className="flex-row flex-wrap gap-2">
                {AMENITIES.map((amenity) => {
                  const checked = selectedAmenities.includes(amenity.label);
                  return (
                    <Pressable
                      key={amenity.key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={amenity.label}
                      onPress={() => toggleAmenity(amenity.label)}
                      className={`flex-row items-center gap-2 rounded-full border px-3 py-2 ${
                        checked ? "border-luxury-gold bg-luxury-gold/15" : "border-border bg-background"
                      }`}
                    >
                      <Glyph
                        name={checked ? "checkmark-circle" : amenity.icon}
                        size={16}
                        color={checked ? colors.gold : colors.mutedForeground}
                      />
                      <Text className={`text-xs ${checked ? "text-luxury-gold" : "text-muted-foreground"}`}>
                        {amenity.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Input
              label={t("admin.properties.fields.customFeatures", "Other features")}
              value={form.features}
              onChangeText={(v) => setField("features", v)}
              hint={t("admin.properties.fields.featuresHint", "Comma separated — anything not listed above")}
            />

            <Input label={t("admin.properties.fields.companyName", "Company")} value={form.companyName} onChangeText={(v) => setField("companyName", v)} />
            <Input
              label={t("admin.properties.fields.phone", "Phone")}
              value={form.phone}
              onChangeText={(v) => setField("phone", v)}
              keyboardType="phone-pad"
            />
            <Input
              label={t("admin.properties.fields.virtualTour", "Virtual tour URL")}
              value={form.virtualTourEmbedUrl}
              onChangeText={(v) => setField("virtualTourEmbedUrl", v)}
              autoCapitalize="none"
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.isFeatured }}
              onPress={() => setField("isFeatured", !form.isFeatured)}
              className="flex-row items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              <Glyph
                name={form.isFeatured ? "checkbox" : "square-outline"}
                size={20}
                color={form.isFeatured ? colors.gold : colors.mutedForeground}
              />
              <Text>{t("admin.properties.fields.isFeatured", "Featured property")}</Text>
            </Pressable>

            <Button
              title={editingId ? t("common.saveChanges", "Save changes") : t("common.create", "Create")}
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              size="lg"
              fullWidth
            />
          </ScrollView>
        </ModalScreen>
      </Modal>
    </View>
  );
}
