import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { AMENITIES, splitAmenities } from "@/lib/amenities";
import type { Property } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import uploadImage from "@/lib/uploadImage";
import { getMediaUrl } from "@/lib/media";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminGlassCard from "@/components/admin/AdminGlassCard";
import { Building2 } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

const fetchProperties = async () => {
  const { data } = await apiClient.get<{ properties: Property[] }>("/properties");
  return data.properties;
};

const initialFormState = {
  title: "",
  location: "",
  currencyCode: "EGP",
  priceLabel: "EGP 0",
  priceValue: 0,
  beds: 0,
  baths: 0,
  sqftLabel: "",
  sqftValue: 0,
  coverImage: "",
  gallery: "",
  description: "",
  features: "",
  amenities: [] as string[],
  type: "",
  status: "For Sale",
  constructionStatus: "Finished Construction",
  companyName: "",
  phone: "",
  virtualTourEmbedUrl: "",
  rentPayPeriod: "month",
  isFeatured: false,
};

const STATUS_OPTIONS = ["For Sale", "For Rent"] as const;
const CONSTRUCTION_STATUS_OPTIONS = ["Finished Construction", "Under Construction"] as const;
const CURRENCY_OPTIONS = [
  { value: "EGP", label: "EGP (Egypt)" },
  { value: "SAR", label: "SAR (Saudi Arabia)" },
  { value: "EUR", label: "EUR (Germany)" },
  { value: "AED", label: "AED (UAE)" },
  { value: "RUB", label: "RUB (Russia)" },
] as const;
const RENT_PAY_PERIOD_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

const formatPriceLabel = (currencyCode: string, priceValue: number) => {
  const rounded = Number.isFinite(priceValue) ? Math.round(priceValue) : 0;
  return `${currencyCode} ${rounded.toLocaleString()}`;
};

const AdminProperties = () => {
  const { data, isLoading } = useQuery({ queryKey: ["properties"], queryFn: fetchProperties });
  const { user } = useAuth();
  const { t } = useTranslation();
  const canDelete = user?.role === "admin";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formState, setFormState] = useState(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const galleryItems = useMemo(
    () =>
      formState.gallery
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [formState.gallery]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formState,
        gallery: formState.gallery.split(",").map((item) => item.trim()).filter(Boolean),
        features: [
          ...formState.amenities,
          ...formState.features.split(",").map((item) => item.trim()).filter(Boolean),
        ],
      };
      if (editingId) {
        return apiClient.put(`/properties/${editingId}`, payload);
      }
      return apiClient.post("/properties", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: editingId ? t("admin.properties.toasts.updated") : t("admin.properties.toasts.created") });
      setFormState(initialFormState);
      setEditingId(null);
    },
    onError: () => {
      toast({ title: t("admin.properties.toasts.operationFailed"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: t("admin.properties.toasts.removed") });
    },
    onError: () => toast({ title: t("admin.properties.toasts.deleteFailed"), variant: "destructive" }),
  });

  const handleEdit = (property: Property) => {
    setEditingId(property._id);
    const currencyCode = property.currencyCode ?? "EGP";
    setFormState({
      title: property.title,
      location: property.location,
      currencyCode,
      priceLabel: property.priceLabel,
      priceValue: property.priceValue,
      beds: property.beds,
      baths: property.baths,
      sqftLabel: property.sqftLabel,
      sqftValue: property.sqftValue,
      coverImage: property.coverImage,
      gallery: property.gallery.join(", "),
      description: property.description,
      amenities: splitAmenities(property.features).selected,
      features: splitAmenities(property.features).custom.join(", "),
      type: property.type,
      status: property.status,
      constructionStatus: property.constructionStatus ?? "Finished Construction",
      companyName: property.companyName ?? "",
      phone: property.phone ?? "",
      virtualTourEmbedUrl: property.virtualTourEmbedUrl ?? "",
      rentPayPeriod: property.rentPayPeriod ?? "month",
      isFeatured: property.isFeatured,
    });
  };

  const toggleAmenity = (label: string) =>
    setFormState((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(label)
        ? prev.amenities.filter((item) => item !== label)
        : [...prev.amenities, label],
    }));

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    const type = event.target instanceof HTMLInputElement ? event.target.type : "text";
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    setFormState((prev) => {
      const nextValue = type === "number" ? Number(value) : type === "checkbox" ? checked : value;
      const nextState: typeof prev = {
        ...prev,
        [name]: nextValue,
      };

      if (name === "priceValue") {
        nextState.priceLabel = formatPriceLabel(String(prev.currencyCode || "EGP"), Number(nextValue));
      }

      return nextState;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploadingCover(true);
    try {
      const url = await uploadImage(file);
      setFormState((prev) => ({ ...prev, coverImage: url }));
      toast({ title: t("admin.properties.toasts.coverUploaded") });
    } catch (error) {
      console.error("Cover upload failed", error);
      toast({
        title: t("admin.properties.toasts.coverUploadFailedTitle"),
        description: t("admin.properties.toasts.coverUploadFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setUploadingCover(false);
      event.target.value = "";
    }
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) {
      return;
    }
    setUploadingGallery(true);
    try {
      const urls = await Promise.all(files.map((file) => uploadImage(file)));
      setFormState((prev) => {
        const existing = prev.gallery
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        const combined = [...existing, ...urls];
        return { ...prev, gallery: combined.join(", ") };
      });
      toast({ title: t("admin.properties.toasts.galleryUploaded", { count: urls.length }) });
    } catch (error) {
      console.error("Gallery upload failed", error);
      toast({
        title: t("admin.properties.toasts.galleryUploadFailedTitle"),
        description: t("admin.properties.toasts.galleryUploadFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setUploadingGallery(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={Building2}
        title={t("admin.properties.headerTitle")}
        description={t("admin.properties.headerDescription")}
      />

      <AdminGlassCard
        eyebrow={t("admin.properties.eyebrow")}
        title={editingId ? t("admin.properties.actions.edit") : t("admin.properties.actions.createProperty")}
        description={t("admin.properties.description")}
      >
        {/* All fields optional notice */}
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-amber-400 text-sm font-medium flex items-center gap-2">
            <span className="text-lg">ℹ️</span>
            {t("admin.properties.allFieldsOptional")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.title")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input name="title" value={formState.title} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.location")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input name="location" value={formState.location} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.currency")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Select
              value={formState.currencyCode}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  currencyCode: value,
                  priceLabel: formatPriceLabel(value, prev.priceValue),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.properties.placeholders.selectCurrency")} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.priceValue")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input type="number" name="priceValue" value={formState.priceValue} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.priceLabel")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input name="priceLabel" value={formState.priceLabel} readOnly />
            <p className="text-xs text-muted-foreground mt-1">{t("admin.properties.helpers.priceLabel")}</p>
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.beds")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input type="number" name="beds" value={formState.beds} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.baths")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input type="number" name="baths" value={formState.baths} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.sqftLabel")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input name="sqftLabel" value={formState.sqftLabel} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.sqftValue")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input type="number" name="sqftValue" value={formState.sqftValue} onChange={handleChange} />
          </div>
          <div className="md:col-span-2 space-y-3">
            <label className="text-sm font-medium">{t("admin.properties.labels.coverImage")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input
              name="coverImage"
              value={formState.coverImage}
              onChange={handleChange}
              placeholder={t("admin.properties.placeholders.coverImage")}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
                className="text-sm"
              />
              {uploadingCover && <p className="text-xs text-muted-foreground">{t("admin.common.uploading")}</p>}
            </div>
            {formState.coverImage && (
              <img
                src={getMediaUrl(formState.coverImage)}
                alt={t("admin.properties.labels.coverImage")}
                className="h-40 w-full object-cover rounded-md border border-border"
              />
            )}
          </div>
          <div className="md:col-span-2 space-y-3">
            <label className="text-sm font-medium">{t("admin.properties.labels.gallery")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Textarea
              name="gallery"
              value={formState.gallery}
              onChange={handleChange}
              placeholder={t("admin.properties.placeholders.gallery")}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryUpload}
                disabled={uploadingGallery}
                className="text-sm"
              />
              {uploadingGallery && <p className="text-xs text-muted-foreground">{t("admin.common.uploading")}</p>}
            </div>
            {galleryItems.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {galleryItems.map((item) => (
                  <img
                    key={item}
                    src={getMediaUrl(item)}
                    alt={t("admin.properties.labels.gallery")}
                    className="h-24 w-full object-cover rounded border border-border"
                  />
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">{t("admin.properties.labels.description")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Textarea name="description" value={formState.description} onChange={handleChange} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">{t("admin.properties.labels.amenities", "Amenities")}</label>
            <p className="text-xs text-white/40">
              {t("admin.properties.labels.amenitiesHint", "Select everything this property has.")}
            </p>
            {/* Stored as labels in `features`, so listings created before this
                picker existed keep their values. */}
            <div className="flex flex-wrap gap-2 pt-1">
              {AMENITIES.map(({ key, label, Icon }) => {
                const checked = formState.amenities.includes(label);
                return (
                  <button
                    type="button"
                    key={key}
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleAmenity(label)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition ${
                      checked
                        ? "border-luxury-gold bg-luxury-gold/15 text-luxury-gold"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <label className="mt-3 text-sm font-medium">
              {t("admin.properties.labels.features")}{" "}
              <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span>
            </label>
            <Textarea name="features" value={formState.features} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.type")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input name="type" value={formState.type} onChange={handleChange} />
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.companyName")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input name="companyName" value={formState.companyName} onChange={handleChange} placeholder="e.g., Crystal DBC" />
            <p className="text-xs text-muted-foreground mt-1">{t("admin.properties.helpers.companyName")}</p>
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.phone")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Input name="phone" value={formState.phone} onChange={handleChange} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Google Maps Virtual Tour iframe <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Textarea
              name="virtualTourEmbedUrl"
              value={formState.virtualTourEmbedUrl}
              onChange={handleChange}
              placeholder="Paste the full Google Maps iframe embed code or /maps/embed URL"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supports Google Maps embed only. Users can explore the complex directly from the property page.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.status")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <Select
              value={formState.status}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  status: value,
                  constructionStatus:
                    value === "For Sale" ? (prev.constructionStatus || "Finished Construction") : prev.constructionStatus,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.properties.placeholders.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`admin.propertyOptions.${option === "For Sale" ? "forSale" : "forRent"}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formState.status === "For Sale" && (
            <div>
              <label className="text-sm font-medium">{t("admin.properties.labels.constructionStatus")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
              <Select
                value={formState.constructionStatus}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, constructionStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.properties.placeholders.selectConstructionStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {CONSTRUCTION_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`admin.propertyOptions.${option === "Finished Construction" ? "finishedConstruction" : "underConstruction"}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formState.status === "For Rent" && (
            <div>
              <label className="text-sm font-medium">{t("admin.properties.labels.rentPayPeriod")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
              <Select
                value={formState.rentPayPeriod}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, rentPayPeriod: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.properties.placeholders.selectRentPeriod")} />
                </SelectTrigger>
                <SelectContent>
                  {RENT_PAY_PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(`admin.propertyOptions.${opt.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">{t("admin.properties.labels.featured")} <span className="text-white/40 text-xs font-normal">({t("admin.common.optional")})</span></label>
            <div className="flex items-center space-x-3 mt-2">
              <input type="checkbox" name="isFeatured" checked={formState.isFeatured} onChange={handleChange} />
              <span className="text-sm text-muted-foreground">{t("admin.properties.labels.showOnHomepage")}</span>
            </div>
          </div>
          <div className="md:col-span-2 flex gap-3 justify-end">
            {editingId && (
              <Button type="button" variant="outline" onClick={() => {
                setFormState(initialFormState);
                setEditingId(null);
              }}>
                {t("admin.properties.actions.cancel")}
              </Button>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {editingId ? t("admin.properties.actions.saveChanges") : t("admin.properties.actions.createProperty")}
            </Button>
          </div>
        </form>
      </AdminGlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && <p className="text-white/50">{t("admin.properties.loading")}</p>}
        {data?.map((property) => (
          <div key={property._id} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 transition hover:bg-white/10">
            {property.coverImage ? (
              <img
                src={getMediaUrl(property.coverImage)}
                alt={property.title}
                className="h-48 w-full object-cover rounded-xl border border-white/10"
              />
            ) : null}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-display font-semibold text-white">{property.title}</h3>
                <p className="text-white/60 text-sm">{property.location}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleEdit(property)} className="bg-white/10 text-white hover:bg-white/20 border border-white/10">
                  {t("admin.properties.actions.edit")}
                </Button>
                {canDelete ? (
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(property._id)}>
                    {t("admin.properties.actions.delete")}
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-luxury-gold font-semibold text-sm">{property.priceLabel}</p>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <span className="px-2 py-1 rounded-full bg-white/10 text-white/80">{t(`admin.propertyOptions.${property.status === "For Sale" ? "forSale" : "forRent"}`)}</span>
              {property.status === "For Sale" && property.constructionStatus ? (
                <span className="px-2 py-1 rounded-full bg-white/10 text-white/80">{t(`admin.propertyOptions.${property.constructionStatus === "Finished Construction" ? "finishedConstruction" : "underConstruction"}`)}</span>
              ) : null}
              {property.isFeatured ? (
                <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">{t("admin.properties.labels.featured")}</span>
              ) : null}
              {property.status === "For Rent" ? (
                <span className="px-2 py-1 rounded-full bg-luxury-gold/10 text-luxury-gold">
                  {t("admin.properties.labels.rentPayPeriod")}: {t(`admin.propertyOptions.${property.rentPayPeriod ?? "month"}`)}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-white/60">{property.description.slice(0, 120)}...</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProperties;
