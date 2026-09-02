import { useState } from "react";
import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { formatDateTime, initialsOf } from "@/lib/format";
import describeActivity from "@/lib/activityDescription";
import { colors } from "@/lib/theme";
import type { ActivityLog } from "@/types";

interface ActivityResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  pages: number;
}

/** Green for additions, red for removals, gold for edits. */
const TONE_COLORS: Record<string, string> = {
  created: colors.success,
  updated: colors.gold,
  deleted: colors.destructive,
  other: colors.mutedForeground,
};

const ROLE_COLORS: Record<string, string> = {
  admin: colors.gold,
  employee: colors.success,
  "property-handler": colors.warning,
};

export default function AdminActivityScreen() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["activity-logs", page],
    queryFn: async () => {
      const { data: response } = await apiClient.get<ActivityResponse>(`/activity-logs?page=${page}`);
      return response;
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <View className="flex-1 bg-background">
      <FlashList
        data={data.logs}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        onRefresh={refetch}
        refreshing={isFetching}
        ListHeaderComponent={
          <Muted className="pb-3">
            {t("admin.activity.total", { count: data.total, defaultValue: `${data.total} entries` })}
          </Muted>
        }
        ListEmptyComponent={<EmptyState title={t("admin.activity.empty", "No activity yet")} />}
        ListFooterComponent={
          data.pages > 1 ? (
            <View className="flex-row items-center justify-between gap-3 pt-4">
              <Button
                title={t("common.previous", "Previous")}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={page <= 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
              />
              <Muted className="text-xs">
                {t("common.pageOf", { page: data.page, pages: data.pages, defaultValue: `${data.page} / ${data.pages}` })}
              </Muted>
              <Button
                title={t("common.next", "Next")}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={page >= data.pages}
                onPress={() => setPage((current) => Math.min(data.pages, current + 1))}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card className="gap-2">
            <View className="flex-row items-start gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-luxury-gold/15">
                <Text className="text-xs font-semibold text-luxury-gold">{initialsOf(item.user?.name)}</Text>
              </View>
              <View className="flex-1">
                <Text variant="label">{item.user?.name ?? t("admin.activity.system", "System")}</Text>
                <Muted className="text-xs">{item.user?.email}</Muted>
              </View>
              {item.user?.role ? (
                <Badge label={item.user.role} color={ROLE_COLORS[item.user.role] ?? colors.mutedForeground} />
              ) : null}
            </View>

            {(() => {
              const described = describeActivity(item, t);
              return (
                <>
                  <View className="flex-row items-start gap-2 border-t border-border pt-2">
                    <Glyph name={described.icon} size={15} color={TONE_COLORS[described.tone]} />
                    <Text className="flex-1 text-sm">{described.summary}</Text>
                  </View>
                  {described.detail ? <Muted className="text-xs">{described.detail}</Muted> : null}
                </>
              );
            })()}

            <Muted className="text-xs">{formatDateTime(item.createdAt)}</Muted>
          </Card>
        )}
      />
    </View>
  );
}
