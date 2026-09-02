import { useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Card, Divider, Muted, ScreenScroll, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { ErrorState, LoadingState } from "@/components/StateViews";
import StatCard from "@/components/admin/StatCard";
import BarChart from "@/components/admin/BarChart";
import { useToast } from "@/components/ToastProvider";
import useRoles from "@/hooks/useRoles";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { exportCsv } from "@/lib/exportCsv";
import { formatDate, formatNumber } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { AnalyticsSummary, User } from "@/types";

export default function AdminReportsScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin } = useRoles();
  const { width } = useWindowDimensions();
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: summary, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics", "reports"],
    queryFn: async () => {
      const { data } = await apiClient.get<AnalyticsSummary>("/analytics/summary");
      return data;
    },
  });

  // Only admins can read /users; employees still get the rest of the report.
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await apiClient.get<{ users: User[] }>("/users");
      return data.users;
    },
  });

  const roleBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((user) => counts.set(user.role, (counts.get(user.role) ?? 0) + 1));
    return Array.from(counts.entries()).map(([role, count]) => ({ label: role, count }));
  }, [users]);

  const runExport = async (name: string, action: () => Promise<unknown>) => {
    setExporting(name);
    try {
      await action();
      toast({ title: t("admin.reports.exported", "Export ready"), variant: "success" });
    } catch (exportError) {
      toast({
        title: t("admin.reports.exportFailed", "Export failed"),
        description: getApiErrorMessage(exportError),
        variant: "error",
      });
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError || !summary) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  const { stats, recentLeads } = summary;
  const timeline = summary.investmentTimeline ?? [];

  return (
    <ScreenScroll>
      <View className="gap-1">
        <Text variant="display">{t("admin.reports.title", "Reports")}</Text>
        <Muted>{t("admin.reports.subtitle", "Platform performance at a glance.")}</Muted>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <StatCard label={t("admin.overview.pieLabels.properties", "Properties")} value={stats.properties} accent />
        <StatCard label={t("admin.overview.pieLabels.leads", "Leads")} value={stats.leads} />
        <StatCard label={t("admin.overview.pieLabels.messages", "Messages")} value={stats.messages} />
        <StatCard label={t("admin.overview.pieLabels.users", "Users")} value={stats.users} />
        <StatCard label={t("admin.overview.pieLabels.wishlist", "Wishlist items")} value={stats.wishlistItems} />
        {stats.totalInvested !== undefined ? (
          <StatCard label={t("admin.reports.totalInvested", "Total invested")} value={formatNumber(stats.totalInvested)} accent />
        ) : null}
        {stats.actualProfit !== undefined ? (
          <StatCard label={t("admin.reports.actualProfit", "Actual profit")} value={formatNumber(stats.actualProfit)} />
        ) : null}
        {stats.investedProperties !== undefined ? (
          <StatCard label={t("admin.reports.investedProperties", "Invested properties")} value={stats.investedProperties} />
        ) : null}
      </View>

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

      {isAdmin && roleBreakdown.length > 0 ? (
        <Card className="gap-3">
          <Text variant="heading">{t("admin.reports.usersByRole", "Users by role")}</Text>
          {roleBreakdown.map((entry, index) => (
            <View key={entry.label}>
              {index > 0 ? <Divider className="mb-3" /> : null}
              <View className="flex-row items-center justify-between">
                <Muted className="capitalize">{entry.label}</Muted>
                <Text variant="label">{entry.count}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Exports */}
      <View className="gap-3">
        <Text variant="heading">{t("admin.reports.exports", "Exports")}</Text>

        <Button
          title={t("admin.reports.exportLeads", "Export recent leads (CSV)")}
          variant="outline"
          size="lg"
          fullWidth
          loading={exporting === "leads"}
          leading={<Glyph name="admin-download" size={18} color={colors.gold} />}
          onPress={() =>
            runExport("leads", () =>
              exportCsv(
                "recent-leads",
                ["Name", "Email", "Phone", "Interested in", "Source", "Status", "Created"],
                recentLeads.map((lead) => [
                  lead.fullName,
                  lead.email,
                  lead.phoneNumber ?? "",
                  lead.interestedIn ?? "",
                  lead.source,
                  lead.status,
                  formatDate(lead.createdAt),
                ]),
              ),
            )
          }
        />

        {isAdmin ? (
          <Button
            title={t("admin.reports.exportUsers", "Export users (CSV)")}
            variant="outline"
            size="lg"
            fullWidth
            loading={exporting === "users"}
            leading={<Glyph name="admin-download" size={18} color={colors.gold} />}
            onPress={() =>
              runExport("users", () =>
                exportCsv(
                  "users",
                  ["Name", "Email", "Role", "Phone", "Country", "Joined"],
                  users.map((user) => [
                    user.name,
                    user.email,
                    user.role,
                    user.phone ?? "",
                    user.country ?? "",
                    formatDate(user.createdAt),
                  ]),
                ),
              )
            }
          />
        ) : null}
      </View>

      {/* Recent leads */}
      <Card className="gap-3">
        <Text variant="heading">{t("admin.overview.recentLeads", "Recent leads")}</Text>
        {recentLeads.length === 0 ? (
          <Muted>{t("admin.overview.noLeads", "No leads yet.")}</Muted>
        ) : (
          recentLeads.map((lead, index) => (
            <View key={lead._id}>
              {index > 0 ? <Divider className="mb-3" /> : null}
              <Text variant="label">{lead.fullName}</Text>
              <Muted className="text-xs">{lead.email}</Muted>
              <View className="flex-row items-center justify-between">
                <Muted className="text-xs">{lead.status}</Muted>
                <Muted className="text-xs">{formatDate(lead.createdAt)}</Muted>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScreenScroll>
  );
}
