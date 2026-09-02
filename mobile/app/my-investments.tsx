import { useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Badge, Button, Card, Input, Muted, ScreenScroll, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { EmptyState, LoadingState } from "@/components/StateViews";
import RoleGate from "@/components/RoleGate";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";
import useRoles from "@/hooks/useRoles";
import { useMyInvestments } from "@/hooks/useInvestments";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { colors, statusColors } from "@/lib/theme";
import type { Investment } from "@/types";

const MyInvestmentsContent = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isInvestor } = useRoles();
  const queryClient = useQueryClient();

  const { data: investments = [], isLoading, refetch, isRefetching } = useMyInvestments();

  const [increaseTarget, setIncreaseTarget] = useState<Investment | null>(null);
  const [increaseAmount, setIncreaseAmount] = useState("5000");
  const [increaseNote, setIncreaseNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const totals = useMemo(() => {
    return investments.reduce(
      (acc, investment) => {
        acc.invested += investment.investmentAmount || 0;
        acc.received += investment.amountReceived || 0;
        acc.expectedProfit += investment.expectedProfit || 0;
        return acc;
      },
      { invested: 0, received: 0, expectedProfit: 0 },
    );
  }, [investments]);

  const outstanding = Math.max(totals.invested + totals.expectedProfit - totals.received, 0);

  const submitIncrease = async () => {
    if (!increaseTarget) return;

    const amountNumber = Number(increaseAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      toast({ title: t("investment.invalidAmount", "Enter a valid amount"), variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(`/investments/${increaseTarget._id}/increase-request`, {
        additionalAmount: amountNumber,
        note: increaseNote.trim() || undefined,
      });
      toast({
        title: t("myInvestments.increaseSubmitted", "Increase requested"),
        description: t("myInvestments.increaseSubmittedDesc", "Our team will review your request."),
        variant: "success",
      });
      void queryClient.invalidateQueries({ queryKey: ["my-investments"] });
      setIncreaseTarget(null);
      setIncreaseNote("");
    } catch (error) {
      toast({
        title: t("myInvestments.increaseFailed", "Could not submit"),
        description: getApiErrorMessage(error),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /** Replaces the web app's jsPDF export with the native print/share sheet. */
  const exportStatement = async () => {
    setExporting(true);
    try {
      const rows = investments
        .map(
          (investment) => `
            <tr>
              <td>${investment.investmentBox?.name ?? investment.property?.title ?? "—"}</td>
              <td>${formatNumber(investment.investmentAmount)}</td>
              <td>${investment.roiPercentage}%</td>
              <td>${formatNumber(investment.amountReceived)}</td>
              <td>${investment.status}</td>
              <td>${investment.paymentStatus}</td>
            </tr>`,
        )
        .join("");

      const html = `
        <html>
          <head><meta charset="utf-8" />
            <style>
              body { font-family: -apple-system, Helvetica, sans-serif; padding: 24px; color: #131720; }
              h1 { font-size: 22px; margin-bottom: 4px; }
              .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f4f1ea; }
              .totals { margin-top: 20px; font-size: 13px; }
            </style>
          </head>
          <body>
            <h1>CrystalDBC — ${t("myInvestments.title", "My Investments")}</h1>
            <div class="meta">${user?.name ?? ""} · ${user?.email ?? ""} · ${formatDate(new Date().toISOString())}</div>
            <table>
              <thead>
                <tr>
                  <th>${t("myInvestments.labels.box", "Investment")}</th>
                  <th>${t("myInvestments.labels.investmentAmount", "Amount")}</th>
                  <th>${t("investment.roi", "ROI")}</th>
                  <th>${t("myInvestments.labels.received", "Received")}</th>
                  <th>${t("myInvestments.labels.status", "Status")}</th>
                  <th>${t("myInvestments.labels.paymentStatus", "Payment")}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="totals">
              <p><strong>${t("myInvestments.totals.invested", "Total invested")}:</strong> ${formatNumber(totals.invested)}</p>
              <p><strong>${t("myInvestments.totals.received", "Total received")}:</strong> ${formatNumber(totals.received)}</p>
              <p><strong>${t("myInvestments.totals.expectedProfit", "Expected profit")}:</strong> ${formatNumber(totals.expectedProfit)}</p>
            </div>
          </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (error) {
      toast({
        title: t("myInvestments.exportFailed", "Export failed"),
        description: getApiErrorMessage(error),
        variant: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  if (!isInvestor) {
    return (
      <EmptyState
        title={t("myInvestments.investorOnlyTitle", "Investor accounts only")}
        description={t("myInvestments.investorOnlyDesc", "Contact our team to enable investing on your account.")}
      />
    );
  }

  if (isLoading) return <LoadingState />;

  return (
    <>
      <ScreenScroll
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />
        }
      >
        {/* Summary */}
        <View className="flex-row flex-wrap gap-3">
          {[
            { label: t("myInvestments.totals.invested", "Invested"), value: totals.invested, accent: true },
            { label: t("myInvestments.totals.received", "Received"), value: totals.received },
            { label: t("myInvestments.totals.expectedProfit", "Expected profit"), value: totals.expectedProfit },
            { label: t("myInvestments.totals.outstanding", "Outstanding"), value: outstanding },
          ].map((item) => (
            <Card key={item.label} className="min-w-[45%] flex-1">
              <Muted className="text-xs">{item.label}</Muted>
              <Text className={`mt-1 text-xl font-semibold ${item.accent ? "text-luxury-gold" : ""}`}>
                {formatNumber(item.value)}
              </Text>
            </Card>
          ))}
        </View>

        {investments.length > 0 ? (
          <Button
            title={t("myInvestments.exportPdf", "Export statement (PDF)")}
            variant="outline"
            size="lg"
            fullWidth
            loading={exporting}
            onPress={exportStatement}
            leading={<Glyph name="admin-download" size={18} color={colors.gold} />}
          />
        ) : null}

        {/* Investments */}
        {investments.length === 0 ? (
          <EmptyState
            title={t("myInvestments.emptyTitle", "No investments yet")}
            description={t("myInvestments.emptyDesc", "Browse opportunities to get started.")}
          />
        ) : (
          <View className="gap-4">
            {investments.map((investment) => {
              const increasePending = investment.increaseRequest?.status === "Pending";
              const name = investment.investmentBox?.name ?? investment.property?.title ?? "—";

              return (
                <Card key={investment._id} className="gap-3">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text variant="heading" className="flex-1">
                      {name}
                    </Text>
                    <Badge label={investment.status} color={statusColors[investment.status]} />
                  </View>

                  <View className="flex-row flex-wrap gap-y-3">
                    {[
                      {
                        label: t("myInvestments.labels.investmentAmount", "Amount"),
                        value: formatCurrency(investment.investmentAmount),
                      },
                      { label: t("investment.roi", "ROI"), value: `${investment.roiPercentage}%` },
                      {
                        label: t("myInvestments.labels.received", "Received"),
                        value: formatCurrency(investment.amountReceived),
                      },
                      {
                        label: t("myInvestments.labels.expectedProfit", "Expected profit"),
                        value: formatCurrency(investment.expectedProfit),
                      },
                    ].map((item) => (
                      <View key={item.label} className="w-1/2">
                        <Muted className="text-xs">{item.label}</Muted>
                        <Text variant="label">{item.value}</Text>
                      </View>
                    ))}
                  </View>

                  <View className="flex-row items-center justify-between border-t border-border pt-3">
                    <View>
                      <Muted className="text-xs">{t("myInvestments.labels.paymentStatus", "Payment")}</Muted>
                      <Text variant="label" style={{ color: statusColors[investment.paymentStatus] }}>
                        {investment.paymentStatus}
                      </Text>
                    </View>
                    {investment.payoutDate ? (
                      <View className="items-end">
                        <Muted className="text-xs">{t("myInvestments.labels.payoutDate", "Payout date")}</Muted>
                        <Text variant="label">{formatDate(investment.payoutDate)}</Text>
                      </View>
                    ) : null}
                  </View>

                  {investment.increaseRequest?.status ? (
                    <View className="rounded-md border border-border bg-background p-3">
                      <Muted className="text-xs">{t("myInvestments.increaseRequest", "Increase request")}</Muted>
                      <View className="mt-1 flex-row items-center justify-between">
                        <Text variant="label">{formatCurrency(investment.increaseRequest.additionalAmount)}</Text>
                        <Badge
                          label={investment.increaseRequest.status}
                          color={statusColors[investment.increaseRequest.status]}
                        />
                      </View>
                    </View>
                  ) : null}

                  <Button
                    title={
                      increasePending
                        ? t("myInvestments.increasePending", "Increase pending")
                        : t("myInvestments.increaseStake", "Increase stake")
                    }
                    variant="outline"
                    fullWidth
                    disabled={increasePending}
                    onPress={() => {
                      setIncreaseTarget(investment);
                      setIncreaseAmount("5000");
                      setIncreaseNote("");
                    }}
                  />
                </Card>
              );
            })}
          </View>
        )}
      </ScreenScroll>

      {/* Increase dialog */}
      <Modal
        visible={Boolean(increaseTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setIncreaseTarget(null)}
      >
        <Pressable className="flex-1 justify-end bg-black/70" onPress={() => setIncreaseTarget(null)}>
          <View
            className="rounded-t-lg border-t border-border bg-card"
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text variant="heading" className="flex-1">
                {t("myInvestments.increaseDialog.title", {
                  name: increaseTarget?.investmentBox?.name ?? "",
                  defaultValue: "Increase your stake",
                })}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setIncreaseTarget(null)} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8" keyboardShouldPersistTaps="handled">
              <Input
                label={t("myInvestments.labels.additionalAmount", "Additional amount")}
                value={increaseAmount}
                onChangeText={setIncreaseAmount}
                keyboardType="numeric"
              />
              <Input
                label={t("myInvestments.labels.notes", "Notes")}
                value={increaseNote}
                onChangeText={setIncreaseNote}
                multiline
                numberOfLines={3}
                className="h-20"
                textAlignVertical="top"
              />
              <Button
                title={t("myInvestments.increaseDialog.submit", "Submit request")}
                onPress={submitIncrease}
                loading={submitting}
                size="lg"
                fullWidth
              />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default function MyInvestmentsScreen() {
  // Same roles the web app allows on /my-investments.
  return (
    <View className="flex-1 bg-background">
      <RoleGate roles={["user", "investor"]}>
        <MyInvestmentsContent />
      </RoleGate>
    </View>
  );
}
