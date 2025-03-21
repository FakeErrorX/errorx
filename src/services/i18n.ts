import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import zh from "@/locales/zh.json";
import bn from "@/locales/bn.json";

export const languages = { en, zh, bn };

const resources = Object.fromEntries(
  Object.entries(languages).map(([key, value]) => [
    key,
    { translation: value },
  ]),
);

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
