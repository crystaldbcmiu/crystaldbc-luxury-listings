import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Input, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ToastProvider";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { colors } from "@/lib/theme";

const COUNTRY_CODES = [
  { label: "+20 EG", value: "+20" },
  { label: "+971 AE", value: "+971" },
  { label: "+1 US", value: "+1" },
  { label: "+44 UK", value: "+44" },
  { label: "+966 SA", value: "+966" },
];

const initialFormState = {
  fullName: "",
  interestedIn: "",
  phoneNumber: "",
  email: "",
  message: "",
};

interface Props {
  visible: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyTitle?: string;
  source?: string;
}

const RegisterInterestSheet = ({ visible, onClose, propertyId, propertyTitle, source = "register-interest" }: Props) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState(initialFormState);
  const [countryCode, setCountryCode] = useState("+20");
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: keyof typeof initialFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const interestOptions = [
    { label: t("registerInterest.options.endUser", "End user"), value: "end-user" },
    { label: t("registerInterest.options.broker", "Broker"), value: "broker" },
    { label: t("registerInterest.options.investor", "Investor"), value: "investor" },
    { label: t("registerInterest.options.jobSeeker", "Job seeker"), value: "job-seeker" },
  ];

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      toast({
        title: t("registerInterest.toasts.errorTitle", "Could not send"),
        description: t("registerInterest.fullName", "Full name") + " / " + t("registerInterest.email", "Email"),
        variant: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const normalizedPhone = form.phoneNumber.trim() ? `${countryCode} ${form.phoneNumber}`.trim() : undefined;
      const normalizedMessage = form.message.trim() || (propertyTitle ? `Interested in ${propertyTitle}` : "");

      await apiClient.post("/leads", {
        fullName: form.fullName,
        interestedIn: form.interestedIn,
        phoneNumber: normalizedPhone,
        email: form.email,
        message: normalizedMessage || undefined,
        source,
        property: propertyId ?? undefined,
      });

      toast({
        title: t("registerInterest.toasts.successTitle", "Thank you"),
        description: t("registerInterest.toasts.successDesc", "We'll be in touch shortly."),
        variant: "success",
      });
      setForm(initialFormState);
      setCountryCode("+20");
      onClose();
    } catch (error) {
      toast({
        title: t("registerInterest.toasts.errorTitle", "Could not send"),
        description: getApiErrorMessage(error),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1 justify-end bg-black/70" onPress={onClose}>
          <View
            className="max-h-[88%] rounded-t-lg border-t border-border bg-card"
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-start gap-3 border-b border-border px-4 py-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-luxury-gold/15">
                <Glyph name="apartment" size={24} color={colors.gold} />
              </View>
              <View className="flex-1">
                <Text variant="heading">{t("registerInterest.title", "Register your interest")}</Text>
                <Muted className="mt-0.5 text-xs">
                  {t("registerInterest.subtitle", "Tell us what you're looking for.")}
                </Muted>
              </View>
              <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerClassName="gap-3 px-4 py-4 pb-8"
              keyboardShouldPersistTaps="handled"
            >
              <Muted className="text-xs">
                {t("registerInterest.description", "Share a few details and our team will reach out.")}
              </Muted>

              <Input
                label={t("registerInterest.fullName", "Full name")}
                value={form.fullName}
                onChangeText={(value) => setField("fullName", value)}
                placeholder={t("registerInterest.fullNamePlaceholder", "Your name")}
                autoCapitalize="words"
              />

              <Select
                label={t("registerInterest.interestedIn", "I am a")}
                placeholder={t("registerInterest.selectOne", "Select one")}
                value={form.interestedIn}
                options={interestOptions}
                onChange={(value) => setField("interestedIn", value)}
              />

              <View className="flex-row gap-2">
                <Select
                  className="w-32"
                  label={t("registerInterest.phoneNumber", "Phone")}
                  value={countryCode}
                  options={COUNTRY_CODES}
                  onChange={setCountryCode}
                />
                <Input
                  containerClassName="flex-1 justify-end"
                  value={form.phoneNumber}
                  onChangeText={(value) => setField("phoneNumber", value)}
                  placeholder={t("registerInterest.phoneNumberPlaceholder", "Phone number")}
                  keyboardType="phone-pad"
                />
              </View>

              <Input
                label={t("registerInterest.email", "Email")}
                value={form.email}
                onChangeText={(value) => setField("email", value)}
                placeholder={t("registerInterest.emailPlaceholder", "you@example.com")}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label={t("registerInterest.tellUsMore", "Tell us more")}
                value={form.message}
                onChangeText={(value) => setField("message", value)}
                placeholder={t("registerInterest.messagePlaceholder", "Optional message")}
                multiline
                numberOfLines={4}
                className="h-24"
                textAlignVertical="top"
              />

              <Button
                title={submitting ? t("registerInterest.submitting", "Sending...") : t("registerInterest.submit", "Submit")}
                onPress={handleSubmit}
                loading={submitting}
                fullWidth
                size="lg"
              />

              <Muted className="text-center text-[10px]">
                {t("registerInterest.disclaimer", "By submitting you agree to be contacted about your enquiry.")}
              </Muted>
            </ScrollView>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RegisterInterestSheet;
