import { View } from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import { Muted } from "@/components/ui/Themed";
import { colors } from "@/lib/theme";
import { formatNumber } from "@/lib/format";

export interface BarChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface BarChartDatum {
  label: string;
  [key: string]: string | number;
}

const CHART_HEIGHT = 180;
const AXIS_HEIGHT = 22;

/**
 * Lightweight grouped bar chart on react-native-svg — the mobile stand-in for
 * the web app's recharts/Three.js visualisations.
 */
export const BarChart = ({
  data,
  series,
  width,
}: {
  data: BarChartDatum[];
  series: BarChartSeries[];
  width: number;
}) => {
  if (data.length === 0 || series.length === 0) {
    return <Muted className="py-6 text-center">No data yet</Muted>;
  }

  const max = Math.max(
    1,
    ...data.flatMap((datum) => series.map((s) => Number(datum[s.key]) || 0)),
  );

  const groupWidth = width / data.length;
  const barWidth = Math.max(4, (groupWidth - 12) / series.length);

  return (
    <View>
      <Svg width={width} height={CHART_HEIGHT + AXIS_HEIGHT}>
        {data.map((datum, groupIndex) => {
          const groupX = groupIndex * groupWidth + 6;
          return (
            <G key={`${datum.label}-${groupIndex}`}>
              {series.map((s, seriesIndex) => {
                const value = Number(datum[s.key]) || 0;
                const barHeight = (value / max) * CHART_HEIGHT;
                return (
                  <Rect
                    key={s.key}
                    x={groupX + seriesIndex * barWidth}
                    y={CHART_HEIGHT - barHeight}
                    width={barWidth - 2}
                    height={Math.max(barHeight, value > 0 ? 2 : 0)}
                    fill={s.color}
                    rx={2}
                  />
                );
              })}
              <SvgText
                x={groupIndex * groupWidth + groupWidth / 2}
                y={CHART_HEIGHT + 15}
                fontSize={9}
                fill={colors.mutedForeground}
                textAnchor="middle"
              >
                {String(datum.label).slice(0, 8)}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <View key={s.key} className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <Muted className="text-xs">{s.label}</Muted>
          </View>
        ))}
      </View>

      <Muted className="mt-1 text-[10px]">Max: {formatNumber(max)}</Muted>
    </View>
  );
};

export default BarChart;
