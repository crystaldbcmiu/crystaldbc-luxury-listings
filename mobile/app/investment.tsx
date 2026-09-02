import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Eyebrow, Input, Muted, ScreenScroll, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { EmptyState, LoadingState } from "@/components/StateViews";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";
import useRoles from "@/hooks/useRoles";
import useCmsSection from "@/hooks/useCmsSection";
import { useInvestmentBoxes } from "@/hooks/useTrendingProjects";
import { useMyInvestments } from "@/hooks/useInvestments";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { formatNumber } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { InvestmentBox, SiteSettingsContent } from "@/types";

export default function InvestmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { isInvestor } = useRoles();

  const { data: siteSettings, isLoading: settingsLoading } = useCmsSection<SiteSettingsContent>("siteSettings", {
    rentButtonEnabled: true,
    investmentPageEnabled: true,
    logoUrl: "/crystaldbclogo.png",
  });

  const { data: boxes = [], isLoading } = useInvestmentBoxes();
  const { data: myInvestments = [] } = useMyInvestments();

  const [selectedBox, setSelectedBox] = useState<InvestmentBox | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const investedBoxIds = useMemo(
    () => new Set(myInvestments.map((investment) => investment.investmentBox?._id).filter(Boolean) as string[]),
    [myInvestments],
  );

  const investmentPageEnabled = siteSettings?.investmentPageEnabled ?? true;
  // Same gate as InvestmentGate in client/src/App.tsx.
  if (!settingsLoading && !investmentPageEnabled) {
    return <Redirect href="/" />;
  }

  const openInvestDialog = (box: InvestmentBox) => {
    if (!isAuthenticated) {
      toast({
        title: t("investment.signInRequired", "Sign in to invest"),
        description: t("investment.signInRequiredDesc", "Create an account or log in to continue."),
      });
      router.push({ pathname: "/auth/[mode]", params: { mode: "login", from: "/investment" } });
      return;
    }

    if (!isInvestor) {
      toast({
        title: t("investment.investorOnly", "Investor accounts only"),
        description: t("investment.investorOnlyDesc", "Contact our team to upgrade your account."),
        variant: "error",
      });
      return;
    }

    setSelectedBox(box);
    setAmount(box.minInvestmentAmount ? String(box.minInvestmentAmount) : "");
    setNotes("");
  };

  const handleInvest = async () => {
    if (!selectedBox) return;

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      toast({ title: t("investment.invalidAmount", "Enter a valid amount"), variant: "error" });
      return;
    }
    if (selectedBox.minInvestmentAmount && amountNumber < selectedBox.minInvestmentAmount) {
      toast({
        title: t("investment.belowMinimum", "Below minimum"),
        description: `${t("investment.minAmount", "Minimum")}: ${formatNumber(selectedBox.minInvestmentAmount)}`,
        variant: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/investments", {
        investmentBoxId: selectedBox._id,
        investmentAmount: amountNumber,
        notes: notes.trim() || undefined,
      });

      toast({
        title: t("investment.submittedTitle", "Investment submitted"),
        description: t("investment.submittedDesc", "Our team will review and confirm shortly."),
        variant: "success",
      });
      void queryClient.invalidateQueries({ queryKey: ["my-investments"] });
      setSelectedBox(null);
    } catch (error) {
      toast({
        title: t("investment.failedTitle", "Could not submit"),
        description: getApiErrorMessage(error),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <>
      <ScreenScroll>
        <View className="gap-2">
          <Eyebrow>{t("investment.eyebrow", "Investment")}</Eyebrow>
          <Text variant="display">{t("investment.title", "Investment Opportunities")}</Text>
          <Muted className="leading-6">
            {t("investment.subtitle", "Curated opportunities with transparent returns.")}
          </Muted>
        </View>

        {boxes.length === 0 ? (
          <EmptyState
            title={t("investment.emptyTitle", "No opportunities available")}
            description={t("investment.emptyDesc", "Please check back soon.")}
          />
        ) : (
          <View className="gap-4">
            {boxes.map((box) => {
              const alreadyInvested = investedBoxIds.has(box._id);
              return (
                <Card key={box._id} className="gap-3">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text variant="heading" className="flex-1">
                      {box.name}
                    </Text>
                    {alreadyInvested ? (
                      <Badge label={t("investment.invested", "Invested")} color={colors.success} />
                    ) : null}
                  </View>

                  {box.description ? <Muted className="leading-5">{box.description}</Muted> : null}

                  <View className="flex-row justify-between border-t border-border pt-3">
                    <View>
                      <Muted className="text-xs">{t("investment.roi", "Expected ROI")}</Muted>
                      <Text className="text-lg font-semibold text-luxury-gold">{box.roiPercentage}%</Text>
                    </View>
                    <View className="items-end">
                      <Muted className="text-xs">{t("investment.minAmount", "Minimum")}</Muted>
                      <Text className="text-lg font-semibold">{formatNumber(box.minInvestmentAmount)}</Text>
                    </View>
                  </View>

                  <Button
                    title={
                      alreadyInvested
                        ? t("investment.viewPortfolio", "View in My Investments")
                        : t("investment.investNow", "Invest now")
                    }
                    variant={alreadyInvested ? "outline" : "primary"}
                    fullWidth
                    onPress={() => (alreadyInvested ? router.push("/my-investments") : openInvestDialog(box))}
                  />
                </Card>
              );
            })}
          </View>
        )}

        {isInvestor ? (
          <Button
            title={t("myInvestments.title", "My Investments")}
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.push("/my-investments")}
          />
        ) : null}
      </ScreenScroll>

      {/* Invest dialog */}
      <Modal
        visible={Boolean(selectedBox)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBox(null)}
      >
        <Pressable className="flex-1 justify-end bg-black/70" onPress={() => setSelectedBox(null)}>
          <View
            className="rounded-t-lg border-t border-border bg-card"
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text variant="heading" className="flex-1">
                {selectedBox?.name}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setSelectedBox(null)} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8" keyboardShouldPersistTaps="handled">
              <View className="flex-row justify-between rounded-md border border-border bg-background p-3">
                <View>
                  <Muted className="text-xs">{t("investment.roi", "Expected ROI")}</Muted>
                  <Text className="font-semibold text-luxury-gold">{selectedBox?.roiPercentage}%</Text>
                </View>
                <View className="items-end">
                  <Muted className="text-xs">{t("investment.minAmount", "Minimum")}</Muted>
                  <Text className="font-semibold">{formatNumber(selectedBox?.minInvestmentAmount)}</Text>
                </View>
              </View>

              <Input
                label={t("myInvestments.labels.investmentAmount", "Investment amount")}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder={String(selectedBox?.minInvestmentAmount ?? 0)}
              />

              <Input
                label={t("myInvestments.labels.notes", "Notes")}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                className="h-20"
                textAlignVertical="top"
              />

              <Button
                title={t("investment.confirmInvest", "Confirm investment")}
                onPress={handleInvest}
                loading={submitting}
                size="lg"
                fullWidth
              />

              <Muted className="text-center text-[10px]">
                {t("investment.disclaimer", "Submitting creates a pending request reviewed by our team.")}
              </Muted>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
