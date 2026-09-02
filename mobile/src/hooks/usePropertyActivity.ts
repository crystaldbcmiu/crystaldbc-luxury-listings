import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  readActivity,
  recordActivity,
  removeActivity,
  type ActivityEntry,
  type ActivityKind,
} from "@/lib/propertyActivity";

const activityKey = (kind: ActivityKind) => ["property-activity", kind] as const;

/**
 * Reads the on-device viewed/contacted history through React Query so the
 * Favorites tab re-renders as soon as a detail screen records something.
 */
export const usePropertyActivity = (kind: ActivityKind) =>
  useQuery({
    queryKey: activityKey(kind),
    queryFn: () => readActivity(kind),
    // Local storage is cheap to re-read and always authoritative.
    staleTime: 0,
    initialData: [] as ActivityEntry[],
  });

/** Returns writers that keep the cached history in sync with storage. */
export const usePropertyActivityActions = () => {
  const queryClient = useQueryClient();

  const record = useCallback(
    async (kind: ActivityKind, propertyId: string) => {
      const next = await recordActivity(kind, propertyId);
      queryClient.setQueryData(activityKey(kind), next);
    },
    [queryClient],
  );

  const remove = useCallback(
    async (kind: ActivityKind, propertyId: string) => {
      const next = await removeActivity(kind, propertyId);
      queryClient.setQueryData(activityKey(kind), next);
    },
    [queryClient],
  );

  return { record, remove };
};

/** Marks a property as viewed once per mount, after its id resolves. */
export const useRecordView = (propertyId?: string) => {
  const { record } = usePropertyActivityActions();

  useEffect(() => {
    if (!propertyId) return;
    void record("viewed", propertyId);
  }, [propertyId, record]);
};

export default usePropertyActivity;
