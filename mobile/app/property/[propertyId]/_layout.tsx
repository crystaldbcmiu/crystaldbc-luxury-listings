import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "@/lib/theme";

export default function PropertyLayout() {
  const { t } = useTranslation();
  const backLabel = t("common.back", "Back");

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { color: colors.foreground },
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        // iOS uses the *previous* screen's back title; without this it shows "index".
        headerBackTitle: backLabel,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, headerBackTitle: backLabel }} />
      <Stack.Screen
        name="description"
        options={{ title: t("propertyDetail.descriptionTitle", "Description"), headerBackTitle: backLabel }}
      />
      <Stack.Screen
        name="gallery"
        options={{ title: t("propertyDetail.galleryTitle", "Gallery"), headerBackTitle: backLabel }}
      />
    </Stack>
  );
}
