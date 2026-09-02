import { Linking } from "react-native";
import useCmsSection from "@/hooks/useCmsSection";
import { usePropertyActivityActions } from "@/hooks/usePropertyActivity";
import type { ContactContent, Property } from "@/types";

/**
 * Resolves which number a Call / WhatsApp button should dial for a property, and
 * records the tap so it shows up under Favorites → Contacted.
 *
 * A listing's own phone wins; otherwise the number from the contact CMS section
 * is used, so cards stay actionable for listings that were added without one.
 * When neither exists the buttons are hidden rather than dialling a placeholder.
 */
const usePropertyContact = (property: Pick<Property, "_id" | "phone">) => {
  const { record } = usePropertyActivityActions();

  const { data: contact } = useCmsSection<ContactContent>("contact", {
    title: "",
    subtitle: "",
    phone: "",
    email: "",
    office: "",
    officeHours: [],
  });

  const rawPhone = property.phone?.trim() || contact?.phone?.trim() || "";
  // tel: wants digits and a leading +; wa.me wants digits only.
  const telPhone = rawPhone.replace(/[^\d+]/g, "");
  const whatsappPhone = telPhone.replace(/\+/g, "");
  const hasPhone = telPhone.replace(/\D/g, "").length >= 6;

  const call = () => {
    if (!hasPhone) return;
    void record("contacted", property._id);
    void Linking.openURL(`tel:${telPhone}`);
  };

  const whatsapp = () => {
    if (!hasPhone) return;
    void record("contacted", property._id);
    void Linking.openURL(`https://wa.me/${whatsappPhone}`);
  };

  return { displayPhone: rawPhone, telPhone, hasPhone, call, whatsapp };
};

export default usePropertyContact;
