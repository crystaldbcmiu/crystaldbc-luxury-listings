import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Divider, Muted, Text } from "@/components/ui/Themed";
import Glyph, { type GlyphName } from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import { LanguageFlag } from "@/components/LanguageFlag";
import { useToast } from "@/components/ToastProvider";
import { useRegisterInterest } from "@/context/RegisterInterestContext";
import useAuth from "@/hooks/useAuth";
import useRoles from "@/hooks/useRoles";
import useCmsSection from "@/hooks/useCmsSection";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  changeLanguage,
  isRTLLanguage,
  type SupportedLanguage,
} from "@/i18n";
import useIsRTL from "@/hooks/useIsRTL";
import { initialsOf } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { SiteSettingsContent } from "@/types";

interface RowProps {
  icon: GlyphName;
  label: string;
  onPress: () => void;
  accent?: boolean;
}

const MenuRow = ({ icon, label, onPress, accent }: RowProps) => {
  const isRTL = useIsRTL();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`items-center gap-3 px-4 py-4 ${isRTL ? "flex-row-reverse" : "flex-row"}`}
    >
      <Glyph name={icon} size={20} color={accent ? colors.gold : colors.mutedForeground} />
      <Text className={`flex-1 ${accent ? "text-luxury-gold" : ""}`} style={{ textAlign: isRTL ? "right" : "left" }}>
        {label}
      </Text>
      <Glyph name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={colors.mutedForeground} />
    </Pressable>
  );
};

export default function MoreScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, logout } = useAuth();
  const { isStaff, isInvestor, isUser } = useRoles();
  const { open: openRegisterInterest } = useRegisterInterest();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const { data: siteSettings } = useCmsSection<SiteSettingsContent>("siteSettings", {
    rentButtonEnabled: true,
    investmentPageEnabled: true,
    logoUrl: "/crystaldbclogo.png",
  });
  const investmentEnabled = siteSettings?.investmentPageEnabled ?? true;

  const go = (href: Href) => () => router.push(href);

  /**
   * Native RTL only takes full effect after a reload, so warn when the switch
   * actually changes writing direction (to or from Arabic).
   */
  const handleLanguageChange = async (value: string) => {
    const next = value as SupportedLanguage;
    const directionChanges = isRTLLanguage(i18n.language) !== isRTLLanguage(next);

    await changeLanguage(next);

    if (directionChanges) {
      Alert.alert(
        t("language.restartTitle", "Restart required"),
        t("language.restartBody", "Close and reopen the app to finish switching the layout direction."),
      );
    }
  };

  /**
   * Account deletion is irreversible, so it asks twice: a warning, then an
   * explicit confirm. The API restricts this to the `user` role as well.
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      t("profile.deleteAccount.title", "Delete account"),
      t(
        "profile.deleteAccount.body",
        "This permanently deletes your account and your saved properties. It cannot be undone.",
      ),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("profile.deleteAccount.confirm", "Delete"),
          style: "destructive",
          onPress: () => {
            Alert.alert(
              t("profile.deleteAccount.confirmTitle", "Are you sure?"),
              t("profile.deleteAccount.confirmBody", "Your account will be removed immediately."),
              [
                { text: t("common.cancel", "Cancel"), style: "cancel" },
                {
                  text: t("profile.deleteAccount.confirmFinal", "Delete my account"),
                  style: "destructive",
                  onPress: () => void deleteAccount(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const deleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await apiClient.delete("/auth/me");
      await logout();
      toast({ title: t("profile.deleteAccount.done", "Account deleted"), variant: "success" });
      router.replace("/");
    } catch (error) {
      toast({
        title: t("profile.deleteAccount.failed", "Could not delete account"),
        description: getApiErrorMessage(error),
        variant: "error",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
    setSigningOut(false);
    toast({ title: t("nav.logout", "Logged out"), variant: "success" });
    router.replace("/");
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-16">
      {/* Account */}
      {isAuthenticated && user ? (
        <Card className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-luxury-gold/15">
            <Text className="font-semibold text-luxury-gold">{initialsOf(user.name)}</Text>
          </View>
          <View className="flex-1">
            <Text variant="heading" numberOfLines={1}>
              {user.name}
            </Text>
            <Muted numberOfLines={1} className="text-xs">
              {user.email}
            </Muted>
          </View>
          <View className="rounded-sm border border-luxury-gold/40 bg-luxury-gold/10 px-2 py-1">
            <Text className="text-[10px] uppercase text-luxury-gold">{user.role}</Text>
          </View>
        </Card>
      ) : (
        <Card className="gap-3">
          <Text variant="heading">{t("auth.loginTitle", "Welcome to CrystalDBC")}</Text>
          <Muted>{t("auth.loginSubtitle", "Sign in to save properties and track investments.")}</Muted>
          <View className="flex-row gap-3">
            <Button
              title={t("nav.login", "Log in")}
              className="flex-1"
              onPress={() => router.push({ pathname: "/auth/[mode]", params: { mode: "login" } })}
            />
            <Button
              title={t("nav.createAccount", "Create Account")}
              variant="outline"
              className="flex-1"
              onPress={() => router.push({ pathname: "/auth/[mode]", params: { mode: "register" } })}
            />
          </View>
        </Card>
      )}

      {/* Staff entry */}
      {isStaff ? (
        <View className="overflow-hidden rounded-lg border border-luxury-gold/40 bg-card">
          <MenuRow icon="security" label={t("nav.dashboard", "Admin Dashboard")} onPress={go("/admin")} accent />
        </View>
      ) : null}

      {/* Explore */}
      <View className="overflow-hidden rounded-lg border border-border bg-card">
        {investmentEnabled ? (
          <>
            <MenuRow icon="growth" label={t("nav.investment", "Investment")} onPress={go("/investment")} />
            <Divider />
          </>
        ) : null}
        {isUser || isInvestor ? (
          <>
            <MenuRow
              icon="briefcase-outline"
              label={t("myInvestments.title", "My Investments")}
              onPress={go("/my-investments")}
            />
            <Divider />
          </>
        ) : null}
        <MenuRow icon="chatbubbles-outline" label={t("chat.title", "CrystalDBC Assistant")} onPress={go("/chat")} />
      </View>

      {/* Company — register interest is company-wide, not tied to a listing. */}
      <View className="overflow-hidden rounded-lg border border-border bg-card">
        <MenuRow
          icon="document"
          label={t("registerInterest.title", "Register your interest")}
          onPress={() => openRegisterInterest({ source: "profile" })}
          accent
        />
        <Divider />
        <MenuRow icon="information-circle-outline" label={t("nav.about", "About")} onPress={go("/about")} />
        <Divider />
        <MenuRow icon="mail-outline" label={t("nav.contact", "Contact")} onPress={go("/contact")} />
        <Divider />
        <MenuRow icon="document-text-outline" label={t("terms.title", "Terms & Conditions")} onPress={go("/terms")} />
      </View>

      {/* Language */}
      <Card className="gap-2">
        <Text variant="label">{t("language.title", "Language")}</Text>
        <Select
          value={i18n.language.split("-")[0]}
          options={SUPPORTED_LANGUAGES.map((code) => ({
            label: LANGUAGE_LABELS[code],
            value: code,
            icon: <LanguageFlag code={code} />,
          }))}
          onChange={handleLanguageChange}
        />
        <Muted className="text-xs">
          {t("language.rtlNote", "Arabic switches the app to right-to-left. Restart the app if the layout does not flip.")}
        </Muted>
      </Card>

      {isAuthenticated ? (
        <Button
          title={t("nav.logout", "Logout")}
          variant="destructive"
          size="lg"
          fullWidth
          loading={signingOut}
          onPress={handleLogout}
        />
      ) : null}

      {/* Customer accounts only — staff and investors are removed by an admin. */}
      {isAuthenticated && isUser ? (
        <View className="gap-2">
          <Button
            title={t("profile.deleteAccount.action", "Delete account")}
            variant="outline"
            size="lg"
            fullWidth
            loading={deletingAccount}
            onPress={handleDeleteAccount}
            className="border-destructive"
          />
          <Muted className="text-center text-xs">
            {t("profile.deleteAccount.hint", "Permanently removes your account and saved properties.")}
          </Muted>
        </View>
      ) : null}
    </ScrollView>
  );
}
