import { useWindowDimensions } from "react-native";
import { Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, Divider, Muted, ScreenScroll, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { ErrorState, LoadingState } from "@/components/StateViews";
import StatCard from "@/components/admin/StatCard";
import BarChart from "@/components/admin/BarChart";
import { ADMIN_NAV } from "@/components/admin/AdminNav";
import useAuth from "@/hooks/useAuth";
import useRoles from "@/hooks/useRoles";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { formatDate, formatNumber } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { AnalyticsSummary } from "@/types";

export default function AdminOverviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { role } = useRoles();
  const { width } = useWindowDimensions();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const { data: summary } = await apiClient.get<AnalyticsSummary>("/analytics/summary");
      return summary;
    },
  });

  const visibleNav = ADMIN_NAV.filter((item) => role && item.roles.includes(role));

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  const { stats, recentLeads } = data;
  const timeline = data.investmentTimeline ?? [];

  return (
    <ScreenScroll>
      <View className="gap-1">
        <Text variant="display">{t("admin.overview.title", "Overview")}</Text>
        <Muted>
          {t("admin.overview.greeting", { name: user?.name ?? "", defaultValue: `Signed in as ${user?.name ?? ""}` })}
        </Muted>
      </View>

      {/* Stats */}
      <View className="flex-row flex-wrap gap-3">
        <StatCard label={t("admin.overview.pieLabels.properties", "Properties")} value={stats.properties} icon="admin-buildings" accent />
        <StatCard label={t("admin.overview.pieLabels.leads", "Leads")} value={stats.leads} icon="admin-clipboard" />
        <StatCard label={t("admin.overview.pieLabels.messages", "Messages")} value={stats.messages} icon="admin-mail" />
        <StatCard label={t("admin.overview.pieLabels.users", "Users")} value={stats.users} icon="admin-users" />
        <StatCard label={t("admin.overview.pieLabels.wishlist", "Wishlist")} value={stats.wishlistItems} icon="heart" />
        {stats.totalInvested !== undefined ? (
          <StatCard
            label={t("admin.overview.totalInvested", "Total invested")}
            value={formatNumber(stats.totalInvested)}
            icon="admin-briefcase"
            accent
          />
        ) : null}
      </View>

      {/* Investment timeline */}
      {timeline.length > 0 ? (
        <Card className="gap-3">
          <Text variant="heading">{t("admin.overview.investmentTimeline", "Investment timeline")}</Text>
          <BarChart
            width={width - 64}
            data={timeline.map((entry) => ({
              label: entry.label,
              invested: entry.invested,
              received: entry.received,
              outstanding: entry.outstanding,
            }))}
            series={[
              { key: "invested", label: t("admin.overview.invested", "Invested"), color: colors.gold },
              { key: "received", label: t("admin.overview.received", "Received"), color: colors.success },
              { key: "outstanding", label: t("admin.overview.outstanding", "Outstanding"), color: colors.warning },
            ]}
          />
        </Card>
      ) : null}

      {/* Sections */}
      <View className="gap-3">
        <Text variant="heading">{t("admin.overview.sections", "Manage")}</Text>
        <View className="overflow-hidden rounded-lg border border-border bg-card">
          {visibleNav.map((item, index) => (
            <View key={String(item.href)}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(item.href)}
                className="flex-row items-center gap-3 px-4 py-4"
              >
                <Glyph name={item.icon} size={20} color={colors.gold} />
                <Text className="flex-1">{t(item.labelKey, item.fallback)}</Text>
                <Glyph name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {/* Recent leads */}
      <Card className="gap-3">
        <View>
          <Text variant="heading">{t("admin.overview.recentLeads", "Recent leads")}</Text>
          <Muted className="text-xs">
            {t("admin.overview.lastSubmissions", {
              count: recentLeads.length,
              defaultValue: `${recentLeads.length} recent submissions`,
            })}
          </Muted>
        </View>

        {recentLeads.length === 0 ? (
          <Muted>{t("admin.overview.noLeads", "No leads yet.")}</Muted>
        ) : (
          recentLeads.map((lead, index) => (
            <View key={lead._id}>
              {index > 0 ? <Divider className="mb-3" /> : null}
              <View className="gap-0.5">
                <Text variant="label">{lead.fullName}</Text>
                <Muted className="text-xs">{lead.email}</Muted>
                <View className="flex-row items-center justify-between">
                  <Muted className="text-xs">{lead.source}</Muted>
                  <Muted className="text-xs">{formatDate(lead.createdAt)}</Muted>
                </View>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScreenScroll>
  );
}
