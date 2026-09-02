import { useParams, Link } from "react-router-dom";
import { MapPin, Bed, Bath, Square, ArrowLeft, Phone, Mail, Heart, DollarSign } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { properties } from "@/data/properties";
import type { Property as StaticProperty } from "@/data/properties";
import { useState, useEffect, useMemo } from "react";
import RegisterInterestDialog from "@/components/RegisterInterestDialog";
import PropertyCard from "@/components/PropertyCard";
import apiClient from "@/lib/apiClient";
import { amenityIcon } from "@/lib/amenities";
import type { Property as ApiProperty, SiteSettingsContent } from "@/types";
import useProperties from "@/hooks/useProperties";
import { getMediaUrl } from "@/lib/media";
import useWishlistActions from "@/hooks/useWishlistActions";
import useAuth from "@/hooks/useAuth";
import { useCmsSection } from "@/hooks/useCmsSection";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import LazyImage from "@/components/LazyImage";

type DetailedProperty = {
  id: string;
  title: string;
  location: string;
  priceLabel: string;
  priceValue: number;
  beds: number;
  baths: number;
  sqftLabel: string;
  sqftValue: number;
  coverImage: string;
  gallery: string[];
  description: string;
  features: string[];
  type: string;
  status: string;
  companyName?: string;
  phone?: string;
  virtualTourEmbedUrl?: string;
  rentPayPeriod?: "day" | "month" | "year";
};

const normalizeStaticProperty = (property: StaticProperty): DetailedProperty => ({
  id: property.id.toString(),
  title: property.title,
  location: property.location,
  priceLabel: property.price,
  priceValue: property.priceValue,
  beds: property.beds,
  baths: property.baths,
  sqftLabel: property.sqft,
  sqftValue: property.sqftValue,
  coverImage: property.image,
  gallery: property.images?.length ? property.images : [property.image],
  description: property.description,
  features: property.features,
  type: property.type,
  status: property.status,
  companyName: undefined,
  phone: property.phone,
  virtualTourEmbedUrl: undefined,
  rentPayPeriod: "month",
});

const normalizeApiProperty = (property: ApiProperty): DetailedProperty => ({
  id: property._id,
  title: property.title,
  location: property.location,
  priceLabel: property.priceLabel,
  priceValue: property.priceValue,
  beds: property.beds,
  baths: property.baths,
  sqftLabel: property.sqftLabel,
  sqftValue: property.sqftValue,
  coverImage: property.coverImage,
  gallery: property.gallery?.length ? property.gallery : [property.coverImage],
  description: property.description,
  features: property.features ?? [],
  type: property.type,
  status: property.status,
  companyName: property.companyName,
  phone: property.phone,
  virtualTourEmbedUrl: property.virtualTourEmbedUrl,
  rentPayPeriod: property.rentPayPeriod,
});

const formatProjectCode = (id: string) => {
  const numericValue = Number(id);
  if (!Number.isNaN(numericValue)) {
    return `CDBC-${numericValue.toString().padStart(4, "0")}`;
  }
  const suffix = id.slice(-4).toUpperCase();
  return `CDBC-${suffix}`;
};

const PropertyDetail = () => {
  const { t } = useTranslation();
  const { propertyId } = useParams();
  const [property, setProperty] = useState<DetailedProperty | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRentDialogOpen, setIsRentDialogOpen] = useState(false);
  const [rentPayPeriod, setRentPayPeriod] = useState<"day" | "month" | "year">("month");
  const [rentStartDate, setRentStartDate] = useState("");
  const [rentNotes, setRentNotes] = useState("");
  const [submittingRent, setSubmittingRent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: similarProperties = [], isLoading: loadingSimilar } = useProperties({
    exclude: property?.id,
    limit: 3,
  });
  const { addToWishlist, activeId, isAdding } = useWishlistActions();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Fetch site settings to check if rent button is enabled
  const { data: siteSettings } = useCmsSection<SiteSettingsContent>("siteSettings", {
    rentButtonEnabled: true,
    investmentPageEnabled: true,
    logoUrl: "/crystaldbclogo.png",
  });
  const rentButtonEnabled = siteSettings?.rentButtonEnabled ?? true;
  
  const fallbackSimilar = useMemo(
    () =>
      properties
        .filter((p) => (property ? p.id.toString() !== property.id : true))
        .slice(0, 3)
        .map((item) => normalizeStaticProperty(item)),
    [property]
  );
  const similarList = useMemo(() => {
    if (!similarProperties.length) {
      return fallbackSimilar;
    }

    const normalized = similarProperties
      .filter((item) => (property ? item._id !== property.id : true))
      .map((item) => normalizeApiProperty(item));

    return normalized.length ? normalized : fallbackSimilar;
  }, [similarProperties, property, fallbackSimilar]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) {
      setProperty(null);
      setError("propertyDetail.notFoundTitle");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSelectedImage(0);

    const numericId = Number(propertyId);
    if (!Number.isNaN(numericId)) {
      const staticMatch = properties.find((p) => p.id === numericId);
      if (staticMatch) {
        setProperty(normalizeStaticProperty(staticMatch));
        setError(null);
        setIsLoading(false);
        return;
      }
    }

    const fetchProperty = async () => {
      try {
        const { data } = await apiClient.get<{ property: ApiProperty }>(`/properties/${propertyId}`);
        setProperty(normalizeApiProperty(data.property));
        setError(null);
      } catch (err) {
        console.error("Failed to load property", err);
        setProperty(null);
        setError("propertyDetail.notFoundTitle");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  const persistedPropertyId = property && /^[a-f\d]{24}$/i.test(property.id) ? property.id : undefined;
  const isWishlistSaving = Boolean(persistedPropertyId && activeId === persistedPropertyId && isAdding);
  const canUseInterest = user?.role === "user";

  useEffect(() => {
    if (!property) return;
    setRentPayPeriod(property.rentPayPeriod ?? "month");
  }, [property]);

  const rentDisabledReason = (() => {
    if (property?.status !== "For Rent") return null;
    if (!isAuthenticated) return t("propertyDetail.disabledReasons.signIn");
    if (user?.role !== "user") return t("propertyDetail.disabledReasons.onlyUsers");
    return null;
  })();

  const displayPhone = property?.phone?.trim() || "+971 12 345 6789";
  const telPhone = displayPhone.replace(/[^\d+]/g, "");

  const handleRentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!property) return;

    if (rentDisabledReason) {
      toast({ title: rentDisabledReason, variant: "destructive" });
      return;
    }

    setSubmittingRent(true);
    try {
      await apiClient.post("/rentals/requests", {
        propertyId: property.id,
        payPeriod: rentPayPeriod,
        startDate: rentStartDate ? new Date(rentStartDate).toISOString() : undefined,
        notes: rentNotes.trim() || undefined,
      });

      toast({
        title: t("propertyDetail.rent.toasts.requestSubmittedTitle"),
        description: t("propertyDetail.rent.toasts.requestSubmittedDescription"),
      });
      setIsRentDialogOpen(false);
      setRentStartDate("");
      setRentNotes("");
    } catch (err) {
      console.error("Rent request failed", err);
      toast({
        title: t("propertyDetail.rent.toasts.unableToSubmitTitle"),
        description: t("propertyDetail.rent.toasts.unableToSubmitDescription"),
        variant: "destructive",
      });
    } finally {
      setSubmittingRent(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-muted-foreground">{t("propertyDetail.loading")}</p>
      </div>
    );
  }

  if (!property) {
    const titleKey = error ?? "propertyDetail.notFoundTitle";
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-primary mb-4">
            {t(titleKey)}
          </h1>
          <Button asChild>
            <Link to="/listings">{t("propertyDetail.backToListings")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-muted/10">
      <SEOHead
        title={`${property.title} - ${property.location}`}
        description={`${property.title} in ${property.location}. ${property.beds} bedrooms, ${property.baths} bathrooms. ${property.priceLabel}. Luxury property by CrystalDBC (Crystal DBC). عقار فاخر من كريستال دي بي سي`}
        canonical={`/property/${propertyId}`}
        ogType="article"
        keywords={`${property.title}, ${property.location}, CrystalDBC property, luxury ${property.type || 'property'}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          "name": property.title,
          "description": `${property.title} in ${property.location}`,
          "url": `https://crystaldbc.com/property/${propertyId}`,
          "image": property.gallery?.[0] || property.coverImage || "",
          "address": { "@type": "PostalAddress", "addressLocality": property.location },
          "offers": { "@type": "Offer", "price": property.priceValue, "priceCurrency": "USD" }
        }}
      />
      {/* Back Button */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Button asChild variant="ghost" className="group">
          <Link to="/listings">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {t("propertyDetail.backToListings")}
          </Link>
        </Button>
      </div>

      {/* Image Gallery */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-1 gap-4">
          <div className="relative h-[500px] overflow-hidden rounded-lg">
            <LazyImage
              src={getMediaUrl(property.gallery[selectedImage])}
              alt={property.title}
              className="w-full h-full"
              priority={selectedImage === 0}
              blurUp={true}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {property.gallery.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative h-32 overflow-hidden rounded-lg border-2 transition-all ${selectedImage === index
                  ? "border-accent"
                  : "border-transparent hover:border-border"
                  }`}
              >
                <LazyImage
                  src={getMediaUrl(image)}
                  alt={`${property.title} ${index + 1}`}
                  className="w-full h-full"
                  blurUp={true}
                  rootMargin="100px"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Property Details */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="mb-8">
              {property.companyName && (
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-luxury-gold/20 to-luxury-gold-light/20 border border-luxury-gold/30">
                  <p className="text-xs uppercase tracking-widest text-luxury-gold/80 mb-1 font-semibold">Listed by</p>
                  <p className="text-2xl font-display font-bold text-luxury-gold">{property.companyName}</p>
                </div>
              )}
              <div className="flex items-center gap-4 mb-4">
                <span className="px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-semibold">
                  {property.status}
                </span>
                <span className="px-4 py-2 bg-muted text-foreground rounded-full text-sm font-semibold">
                  {property.type}
                </span>
                {rentButtonEnabled && property.status === "For Rent" && (
                  <span className="px-4 py-2 rounded-full text-sm font-semibold border border-white/10 bg-white/5 text-foreground">
                    {t("propertyDetail.rent.payPeriodBadge", {
                      period: t(`propertyDetail.rent.payPeriods.${property.rentPayPeriod ?? "month"}`),
                    })}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-4">
                {property.title}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <MapPin className="h-5 w-5" />
                <span className="text-lg">{property.location}</span>
              </div>
              <p className="text-4xl font-display font-bold text-accent">
                {property.priceLabel}
              </p>
            </div>

            <div className="flex items-center gap-8 mb-8 pb-8 border-b border-border">
              <div className="flex items-center gap-3">
                <Bed className="h-6 w-6 text-accent" />
                <div>
                  <p className="text-2xl font-semibold text-primary">{property.beds}</p>
                  <p className="text-sm text-muted-foreground">{t("propertyDetail.bedrooms")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Bath className="h-6 w-6 text-accent" />
                <div>
                  <p className="text-2xl font-semibold text-primary">{property.baths}</p>
                  <p className="text-sm text-muted-foreground">{t("propertyDetail.bathrooms")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Square className="h-6 w-6 text-accent" />
                <div>
                  <p className="text-2xl font-semibold text-primary">{property.sqftLabel}</p>
                  <p className="text-sm text-muted-foreground">{t("propertyDetail.squareFeet")}</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-primary mb-4">
                {t("propertyDetail.aboutTitle")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {property.description}
              </p>
            </div>

            {property.virtualTourEmbedUrl ? (
              <div className="mb-8">
                <h2 className="text-2xl font-display font-bold text-primary mb-4">
                  Virtual Tour Around The Complex
                </h2>
                <p className="text-muted-foreground mb-4">
                  Use the embedded map to freely walk around streets and amenities near this property.
                </p>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <iframe
                    src={property.virtualTourEmbedUrl}
                    title={`${property.title} virtual tour`}
                    className="w-full h-[520px] md:h-[620px]"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            ) : null}

            <div>
              <h2 className="text-2xl font-display font-bold text-primary mb-4">
                {t("propertyDetail.featuresTitle")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property.features.map((feature, index) => {
                  const Icon = amenityIcon(feature);
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Contact Card */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
              <h3 className="text-2xl font-display font-bold text-primary mb-2">
                {t("propertyDetail.contactTitle", { title: property.title })}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {t("propertyDetail.contactSubtitle")}
              </p>

              <div className="space-y-4">
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-2 hover:bg-accent/10"
                >
                  <a href={`tel:${telPhone}`} className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t("propertyDetail.callCta", { phone: displayPhone })}
                  </a>
                </Button>

                {canUseInterest && (
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {t("propertyDetail.interestedCta")}
                  </Button>
                )}

                {rentButtonEnabled && property.status === "For Rent" && (
                  <>
                    <Button
                      onClick={() => setIsRentDialogOpen(true)}
                      disabled={Boolean(rentDisabledReason)}
                      className="w-full bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-luxury-dark hover:brightness-110 flex items-center justify-center gap-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      {t("propertyDetail.rent.applyCta")}
                    </Button>
                    {rentDisabledReason && (
                      <p className="text-sm text-muted-foreground text-center">{rentDisabledReason}</p>
                    )}
                  </>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full border border-dashed border-border flex items-center justify-center gap-2"
                  onClick={() => addToWishlist(persistedPropertyId)}
                  disabled={!persistedPropertyId || isWishlistSaving}
                >
                  <Heart className="h-4 w-4" />
                  {persistedPropertyId
                    ? isWishlistSaving
                      ? t("propertyDetail.wishlistSaving")
                      : t("propertyDetail.wishlistSave")
                    : t("propertyDetail.wishlistLinkRequired")}
                </Button>

                {canUseInterest && (
                  <RegisterInterestDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    propertyId={property.id}
                    propertyTitle={property.title}
                  />
                )}

                {rentButtonEnabled && (
                  <Dialog open={isRentDialogOpen} onOpenChange={setIsRentDialogOpen}>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-display flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-luxury-gold" />
                          {t("propertyDetail.rent.dialogTitle", { title: property.title })}
                        </DialogTitle>
                        <DialogDescription>{t("propertyDetail.rent.dialogDescription")}</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleRentSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("propertyDetail.rent.payPeriod")}</label>
                          <Select value={rentPayPeriod} onValueChange={(v) => setRentPayPeriod(v as "day" | "month" | "year")}>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">{t("propertyDetail.rent.payPeriods.day")}</SelectItem>
                              <SelectItem value="month">{t("propertyDetail.rent.payPeriods.month")}</SelectItem>
                              <SelectItem value="year">{t("propertyDetail.rent.payPeriods.year")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("propertyDetail.rent.startDate")}</label>
                          <Input type="date" value={rentStartDate} onChange={(e) => setRentStartDate(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("propertyDetail.rent.notesOptional")}</label>
                          <Textarea
                            value={rentNotes}
                            onChange={(e) => setRentNotes(e.target.value)}
                            placeholder={t("propertyDetail.rent.notesPlaceholder")}
                          />
                        </div>

                        <div className="flex items-center justify-end gap-3">
                          <Button type="button" variant="ghost" onClick={() => setIsRentDialogOpen(false)}>
                            {t("propertyDetail.cancel")}
                          </Button>
                          <Button type="submit" disabled={submittingRent}>
                            {submittingRent ? t("propertyDetail.submitting") : t("propertyDetail.rent.submitRequest")}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* Project Statistics Card */}
            <div className="bg-card border border-border rounded-lg p-6 mt-6">
              <h3 className="text-xl font-display font-bold text-primary mb-6">
                {t("propertyDetail.projectStatisticsTitle")}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">{t("propertyDetail.projectId")}</span>
                  <span className="text-foreground font-semibold">{formatProjectCode(property.id)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">{t("propertyDetail.status")}</span>
                  <span className="text-foreground font-semibold">{property.status}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">{t("propertyDetail.progress")}</span>
                  <span className="text-foreground font-semibold">—</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("propertyDetail.serviceCharge")}</span>
                  <span className="text-foreground font-semibold">—</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Properties */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-primary mb-2">
            {t("propertyDetail.similarPropertiesTitle")}
          </h2>
          <p className="text-muted-foreground">
            {t("propertyDetail.similarPropertiesSubtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(loadingSimilar ? fallbackSimilar : similarList).map((prop) => (
            <PropertyCard
              key={prop.id}
              id={prop.id}
              image={prop.coverImage || prop.gallery[0]}
              title={prop.title}
              location={prop.location}
              price={prop.priceLabel}
              beds={prop.beds}
              baths={prop.baths}
              sqft={prop.sqftLabel}
              status={prop.status}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default PropertyDetail;
