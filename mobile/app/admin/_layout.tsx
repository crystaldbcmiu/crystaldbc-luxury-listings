import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import RoleGate, { STAFF_ROLES } from "@/components/RoleGate";
import { colors } from "@/lib/theme";

export default function AdminLayout() {
  const { t } = useTranslation();

  return (
    <RoleGate roles={STAFF_ROLES}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { color: colors.foreground },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: t("admin.nav.overview", "Admin") }} />
        <Stack.Screen name="properties" options={{ title: t("admin.nav.properties", "Properties") }} />
        <Stack.Screen name="rentals" options={{ title: t("admin.nav.rentals", "Rental Requests") }} />
        <Stack.Screen name="leads" options={{ title: t("admin.nav.leads", "Leads") }} />
        <Stack.Screen name="messages" options={{ title: t("admin.nav.messages", "Messages") }} />
        <Stack.Screen name="reports" options={{ title: t("admin.nav.reports", "Reports") }} />
        <Stack.Screen name="projects" options={{ title: t("admin.nav.trendingProjects", "Trending Projects") }} />
        <Stack.Screen name="cms" options={{ title: t("admin.nav.cms", "CMS") }} />
        <Stack.Screen name="investments" options={{ title: t("admin.nav.investments", "Investments") }} />
        <Stack.Screen name="investment-boxes" options={{ title: t("admin.nav.investmentBoxes", "Investment Boxes") }} />
        <Stack.Screen name="users" options={{ title: t("admin.nav.users", "Users") }} />
        <Stack.Screen name="activity" options={{ title: t("admin.nav.activityLogs", "Activity Logs") }} />
      </Stack>
    </RoleGate>
  );
}
