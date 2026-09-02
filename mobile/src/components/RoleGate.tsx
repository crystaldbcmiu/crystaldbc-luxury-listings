import type { ReactNode } from "react";
import { Redirect, usePathname } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import useAuth from "@/hooks/useAuth";
import { LoadingState } from "@/components/StateViews";
import { Muted, Text } from "@/components/ui/Themed";
import type { Role } from "@/types";

/** Roles that may open the admin console — mirrors client/src/App.tsx. */
export const STAFF_ROLES: Role[] = ["admin", "employee", "property-handler"];

export const AccessRestricted = () => {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-6">
      <Text variant="title" className="text-center">
        {t("access.title", "Access Restricted")}
      </Text>
      <Muted className="text-center">
        {t("access.description", "You do not have permission to view this page.")}
      </Muted>
    </View>
  );
};

/**
 * Port of client/src/components/ProtectedRoute.tsx: unauthenticated users are
 * sent to login, authenticated users lacking the role see AccessRestricted.
 */
const RoleGate = ({ children, roles }: { children: ReactNode; roles?: Role[] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return <Redirect href={{ pathname: "/auth/[mode]", params: { mode: "login", from: pathname } }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <AccessRestricted />;
  }

  return <>{children}</>;
};

export default RoleGate;
