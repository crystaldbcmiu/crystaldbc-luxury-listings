import * as ImagePicker from "expo-image-picker";
import apiClient from "./apiClient";

/**
 * Uploads to the same POST /uploads/image endpoint the web app uses.
 * React Native's FormData takes a {uri, name, type} object rather than a File.
 */
export const uploadImageAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
  const formData = new FormData();
  const name = asset.fileName ?? asset.uri.split("/").pop() ?? `upload-${Date.now()}.jpg`;
  const type = asset.mimeType ?? "image/jpeg";

  formData.append("image", {
    uri: asset.uri,
    name,
    type,
  } as unknown as Blob);

  const { data } = await apiClient.post<{ url: string }>("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.url;
};

/** Opens the library and uploads the chosen images, returning their public URLs. */
export const pickAndUploadImages = async (options?: { multiple?: boolean }): Promise<string[]> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to upload images.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: options?.multiple ?? false,
    quality: 0.8,
  });

  if (result.canceled) return [];

  const urls: string[] = [];
  for (const asset of result.assets) {
    urls.push(await uploadImageAsset(asset));
  }
  return urls;
};

export default pickAndUploadImages;
