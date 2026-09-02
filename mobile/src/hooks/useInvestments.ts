import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import useRoles from "@/hooks/useRoles";
import type { Investment } from "@/types";

/** Investor-only portfolio. Disabled for other roles so we don't fire a 403. */
export const useMyInvestments = () => {
  const { isInvestor } = useRoles();

  return useQuery({
    queryKey: ["my-investments"],
    enabled: isInvestor,
    queryFn: async () => {
      const { data } = await apiClient.get<{ investments: Investment[] }>("/investments/my");
      return data.investments;
    },
  });
};

export default useMyInvestments;
