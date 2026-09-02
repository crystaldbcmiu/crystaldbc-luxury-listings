import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";

// Ported from client/src/hooks/useWishlistActions.ts.
const useWishlistActions = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (propertyId: string) => apiClient.post("/wishlist", { property: propertyId }),
    onSuccess: () => {
      toast({
        title: t("wishlist.addedTitle", "Added to wishlist"),
        description: t("wishlist.addedDesc", "Review it anytime from your wishlist."),
        variant: "success",
      });
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: () => {
      toast({
        title: t("wishlist.failedTitle", "Wishlist update failed"),
        description: t("common.tryAgain", "Please try again."),
        variant: "error",
      });
    },
    onSettled: () => setActiveId(null),
  });

  const addToWishlist = (propertyId?: string) => {
    if (!propertyId) {
      toast({
        title: t("wishlist.linkRequiredTitle", "Link required"),
        description: t("wishlist.linkRequiredDesc", "This project isn't linked to a live property yet."),
        variant: "error",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: t("wishlist.signInTitle", "Sign in to save"),
        description: t("wishlist.signInDesc", "Log in to keep track of your favorite homes."),
      });
      router.push({ pathname: "/auth/[mode]", params: { mode: "login" } });
      return;
    }

    setActiveId(propertyId);
    mutation.mutate(propertyId);
  };

  return {
    addToWishlist,
    isAdding: mutation.isPending,
    activeId,
  };
};

export default useWishlistActions;
