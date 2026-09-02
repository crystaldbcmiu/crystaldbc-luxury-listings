import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import BrandLogo from "@/components/BrandLogo";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiClient";
import { colors } from "@/lib/theme";

const COUNTRY_OPTIONS = [
  { value: "Egypt", label: "Egypt" },
  { value: "UAE", label: "UAE" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
  { value: "Germany", label: "Germany" },
  { value: "Russia", label: "Russia" },
  { value: "Other", label: "Other" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const { mode: modeParam, from } = useLocalSearchParams<{ mode?: string; from?: string }>();
  const mode: "login" | "register" = modeParam === "register" ? "register" : "login";

  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { login, register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    country: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const goBackAfterAuth = () => {
    if (from && typeof from === "string" && from.startsWith("/")) {
      router.replace(from as never);
      return;
    }
    router.replace("/");
  };

  // Mirrors the validation in client/src/pages/Auth.tsx.
  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      if (mode === "login") {
        if (!form.email.trim()) {
          setErrors({ email: t("auth.validation.emailRequired", "Email is required") });
          setLoading(false);
          return;
        }
        if (!EMAIL_RE.test(form.email)) {
          setErrors({ email: t("auth.validation.emailInvalid", "Enter a valid email") });
          setLoading(false);
          return;
        }

        await login({ email: form.email, password: form.password });
        toast({
          title: t("auth.meta.welcomeBack", "Welcome back"),
          description: t("auth.meta.signedIn", "You are signed in."),
          variant: "success",
        });
      } else {
        const newErrors: Record<string, string> = {};

        if (!form.name.trim()) newErrors.name = t("auth.validation.nameRequired", "Name is required");
        if (!form.email.trim()) {
          newErrors.email = t("auth.validation.emailRequired", "Email is required");
        } else if (!EMAIL_RE.test(form.email)) {
          newErrors.email = t("auth.validation.emailInvalid", "Enter a valid email");
        }
        if (!form.phone.trim()) newErrors.phone = t("auth.validation.phoneRequired", "Phone is required");
        if (!form.country) newErrors.country = t("auth.validation.countryRequired", "Country is required");

        if (form.password.length < 6) {
          newErrors.password = t("auth.validation.passwordMin", "Password must be at least 6 characters");
        } else if (!/\d/.test(form.password)) {
          newErrors.password = t("auth.validation.passwordNumber", "Password must contain a number");
        }

        if (form.password !== form.confirmPassword) {
          newErrors.confirmPassword = t("auth.validation.passwordMismatch", "Passwords do not match");
        }

        if (!agreedToTerms) newErrors.terms = t("auth.validation.termsRequired", "You must accept the terms");

        if (Object.keys(newErrors).length) {
          setErrors(newErrors);
          toast({
            title: t("auth.meta.passwordPolicyTitle", "Check your details"),
            description: Object.values(newErrors).join(" • "),
            variant: "error",
          });
          setLoading(false);
          return;
        }

        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          country: form.country,
        });
        toast({
          title: t("auth.meta.created", "Account created"),
          description: t("auth.meta.welcome", "Welcome to CrystalDBC."),
          variant: "success",
        });
      }

      goBackAfterAuth();
    } catch (error) {
      toast({
        title: t("auth.meta.authFailed", "Authentication failed"),
        description: getApiErrorMessage(error),
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () =>
    router.replace({ pathname: "/auth/[mode]", params: { mode: mode === "login" ? "register" : "login", from } });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-row items-center px-4 py-3">
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
            <Glyph name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="gap-4 px-5 pb-12" keyboardShouldPersistTaps="handled">
          <View className="mb-2 items-center gap-4">
            <BrandLogo variant="full" height={72} />
            <View className="w-full items-center gap-1">
              <Text variant="display" className="text-center">
                {mode === "login" ? t("auth.loginTitle", "Welcome back") : t("auth.registerTitle", "Create your account")}
              </Text>
              <Muted className="text-center">
                {mode === "login"
                  ? t("auth.loginSubtitle", "Sign in to continue.")
                  : t("auth.registerSubtitle", "Join CrystalDBC today.")}
              </Muted>
            </View>
          </View>

          {mode === "register" ? (
            <Input
              label={t("auth.fields.name", "Full name")}
              value={form.name}
              onChangeText={(value) => setField("name", value)}
              error={errors.name}
              autoCapitalize="words"
              textContentType="name"
            />
          ) : null}

          <Input
            label={t("auth.fields.email", "Email")}
            value={form.email}
            onChangeText={(value) => setField("email", value)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          {mode === "register" ? (
            <>
              <Input
                label={t("auth.fields.phone", "Phone")}
                value={form.phone}
                onChangeText={(value) => setField("phone", value)}
                error={errors.phone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
              <Select
                label={t("auth.fields.country", "Country")}
                placeholder={t("auth.fields.countryPlaceholder", "Select your country")}
                value={form.country}
                options={COUNTRY_OPTIONS}
                onChange={(value) => setField("country", value)}
                error={errors.country}
              />
            </>
          ) : null}

          <View>
            <Input
              label={t("auth.fields.password", "Password")}
              value={form.password}
              onChangeText={(value) => setField("password", value)}
              error={errors.password}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType={mode === "login" ? "password" : "newPassword"}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              onPress={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-9"
              hitSlop={8}
            >
              <Glyph
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          {mode === "register" ? (
            <>
              <View>
                <Input
                  label={t("auth.fields.confirmPassword", "Confirm password")}
                  value={form.confirmPassword}
                  onChangeText={(value) => setField("confirmPassword", value)}
                  error={errors.confirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowConfirm((value) => !value)}
                  className="absolute right-3 top-9"
                  hitSlop={8}
                >
                  <Glyph
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreedToTerms }}
                onPress={() => {
                  setAgreedToTerms((value) => !value);
                  setErrors((prev) => ({ ...prev, terms: "" }));
                }}
                className="flex-row items-center gap-3"
              >
                <Glyph
                  name={agreedToTerms ? "checkbox" : "square-outline"}
                  size={20}
                  color={agreedToTerms ? colors.gold : colors.mutedForeground}
                />
                <Muted className="flex-1">{t("auth.fields.agreeTerms", "I agree to the Terms & Conditions")}</Muted>
              </Pressable>
              {errors.terms ? <Text className="text-xs text-destructive">{errors.terms}</Text> : null}
            </>
          ) : null}

          <Button
            title={mode === "login" ? t("auth.actions.login", "Log in") : t("auth.actions.register", "Create account")}
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            fullWidth
            className="mt-2"
          />

          <Pressable accessibilityRole="button" onPress={switchMode} className="items-center py-2">
            <Muted>
              {mode === "login"
                ? t("auth.switchToRegister", "Don't have an account? Create one")
                : t("auth.switchToLogin", "Already have an account? Log in")}
            </Muted>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
