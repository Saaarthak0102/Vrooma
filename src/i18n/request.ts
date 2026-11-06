import { getRequestConfig } from "next-intl/server";

// English only. next-intl is kept purely as the text catalogue (messages/en.json); there is no locale routing.
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("../../messages/en.json")).default,
}));
