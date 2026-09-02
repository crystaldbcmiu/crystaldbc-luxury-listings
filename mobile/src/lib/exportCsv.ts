import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const escapeCell = (cell: unknown) => `"${String(cell ?? "").replace(/"/g, '""')}"`;

/**
 * Mobile replacement for the web app's Blob/anchor CSV download: writes the file
 * to the cache directory and hands it to the OS share sheet.
 */
export const exportCsv = async (filename: string, header: string[], rows: (string | number | null | undefined)[][]) => {
  const csv = [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");

  const file = new File(Paths.cache, filename.endsWith(".csv") ? filename : `${filename}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
    return file.uri;
  }

  throw new Error("Sharing is not available on this device.");
};

export default exportCsv;
