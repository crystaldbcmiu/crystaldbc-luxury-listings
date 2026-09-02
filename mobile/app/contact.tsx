import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Card, Input, Muted, ScreenScroll, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { useToast } from "@/components/ToastProvider";
import useCmsSection from "@/hooks/useCmsSection";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { colors } from "@/lib/theme";
import type { ContactContent } from "@/types";

export default function ContactScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: contact } = useCmsSection<ContactContent>("contact", {
    title: t("contact.infoTitle", "Get in touch"),
    subtitle: t("contact.infoSubtitle", "We'd love to hear from you."),
    phone: "+1 (888) 555-1234",
    email: "info@crystaldbc.com",
    office: "123 Luxury Avenue, Beverly Hills, CA 90210",
    officeHours: [
      "Monday - Friday: 9:00 AM - 6:00 PM",
      "Saturday: 10:00 AM - 4:00 PM",
      "Sunday: By Appointment Only",
    ],
  });

  const setField = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({
        title: t("common.messageFailed", "Could not send"),
        description: t("contact.validationRequired", "Name, email and message are required."),
        variant: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/messages", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
        page: "contact",
      });
      toast({
        title: t("common.messageSent", "Message sent"),
        description: t("common.messageSentDesc", "Thank you for contacting us. We'll respond shortly."),
        variant: "success",
      });
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      toast({
        title: t("common.messageFailed", "Failed to send"),
        description: getApiErrorMessage(error),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const officeHours = Array.isArray(contact?.officeHours) ? contact.officeHours : [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <ScreenScroll>
        <View className="gap-1">
          <Text variant="display">{contact?.title}</Text>
          <Muted className="leading-6">{contact?.subtitle}</Muted>
        </View>

        <Card className="gap-4">
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3"
            onPress={() => contact?.phone && Linking.openURL(`tel:${contact.phone.replace(/\s/g, "")}`)}
          >
            <Glyph name="phone" size={22} color={colors.gold} />
            <View className="flex-1">
              <Muted className="text-xs">{t("common.phone", "Phone")}</Muted>
              <Text>{contact?.phone}</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3"
            onPress={() => contact?.email && Linking.openURL(`mailto:${contact.email}`)}
          >
            <Glyph name="mail-outline" size={20} color={colors.gold} />
            <View className="flex-1">
              <Muted className="text-xs">{t("common.email", "Email")}</Muted>
              <Text>{contact?.email}</Text>
            </View>
          </Pressable>

          <View className="flex-row items-start gap-3">
            <Glyph name="location" size={22} color={colors.gold} />
            <View className="flex-1">
              <Muted className="text-xs">{t("common.office", "Office")}</Muted>
              <Text>{contact?.office}</Text>
              {contact?.officeHelper ? <Muted className="mt-0.5 text-xs">{contact.officeHelper}</Muted> : null}
            </View>
          </View>

          {officeHours.length > 0 ? (
            <View className="gap-1 border-t border-border pt-3">
              {officeHours.map((line, index) => (
                <Muted key={index} className="text-xs">
                  {line}
                </Muted>
              ))}
            </View>
          ) : null}
        </Card>

        <View className="gap-3">
          <Text variant="heading">{t("contact.formTitle", "Send us a message")}</Text>

          <Input
            label={t("contact.fields.name", "Name")}
            value={form.name}
            onChangeText={(value) => setField("name", value)}
            autoCapitalize="words"
          />
          <Input
            label={t("contact.fields.email", "Email")}
            value={form.email}
            onChangeText={(value) => setField("email", value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label={t("contact.fields.phone", "Phone")}
            value={form.phone}
            onChangeText={(value) => setField("phone", value)}
            keyboardType="phone-pad"
          />
          <Input
            label={t("contact.fields.message", "Message")}
            value={form.message}
            onChangeText={(value) => setField("message", value)}
            multiline
            numberOfLines={5}
            className="h-32"
            textAlignVertical="top"
          />

          <Button
            title={t("contact.actions.send", "Send message")}
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            fullWidth
          />
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}
