import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Muted, Text } from "@/components/ui/Themed";
import Glyph, { type GlyphName } from "@/components/ui/Glyph";
import { colors } from "@/lib/theme";

export const LoadingState = ({ label }: { label?: string }) => {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-3 py-16">
      <ActivityIndicator color={colors.gold} />
      <Muted>{label ?? t("common.loading", "Loading...")}</Muted>
    </View>
  );
};

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = "search",
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Defaults to the brand magnifier, since most empty lists are search results. */
  icon?: GlyphName;
}) => (
  <View className="items-center justify-center gap-2 px-6 py-16">
    <Glyph name={icon} size={52} color={`${colors.gold}66`} />
    <Text variant="heading" className="mt-2 text-center">
      {title}
    </Text>
    {description ? <Muted className="text-center">{description}</Muted> : null}
    {actionLabel && onAction ? (
      <Button title={actionLabel} variant="outline" onPress={onAction} className="mt-3" />
    ) : null}
  </View>
);

export const ErrorState = ({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <View className="items-center justify-center gap-3 px-6 py-16">
      <Glyph name="alert-circle-outline" size={52} color={`${colors.destructive}AA`} />
      <Text variant="heading" className="text-center">
        {t("common.messageFailed", "Something went wrong")}
      </Text>
      {message ? <Muted className="text-center">{message}</Muted> : null}
      {onRetry ? <Button title={t("common.tryAgain", "Please try again.")} variant="outline" onPress={onRetry} /> : null}
    </View>
  );
};
