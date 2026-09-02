import { useTranslation } from "react-i18next";
import { isRTLLanguage } from "@/i18n";

/** True when the active language reads right-to-left (Arabic). */
export const useIsRTL = () => {
  const { i18n } = useTranslation();
  return isRTLLanguage(i18n.language);
};

export default useIsRTL;
