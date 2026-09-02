import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import type { InvestmentBox, TrendingProject } from "@/types";

export const useTrendingProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ projects: TrendingProject[] }>("/projects");
      return data.projects;
    },
  });

/** Public list — the API only returns active boxes here. */
export const useInvestmentBoxes = () =>
  useQuery({
    queryKey: ["investment-boxes"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ boxes: InvestmentBox[] }>("/investment-boxes");
      return data.boxes;
    },
  });

export default useTrendingProjects;
