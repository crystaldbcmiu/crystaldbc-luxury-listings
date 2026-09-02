import { View } from "react-native";
import { Card, Muted, Text } from "@/components/ui/Themed";
import Glyph, { type GlyphName } from "@/components/ui/Glyph";
import { colors } from "@/lib/theme";

export const StatCard = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: GlyphName;
  accent?: boolean;
}) => (
  <Card className="min-w-[45%] flex-1 gap-1">
    <View className="flex-row items-center justify-between">
      <Muted className="flex-1 text-xs">{label}</Muted>
      {icon ? <Glyph name={icon} size={16} color={colors.gold} /> : null}
    </View>
    <Text className={`text-2xl font-semibold ${accent ? "text-luxury-gold" : ""}`}>{value}</Text>
  </Card>
);

export default StatCard;
