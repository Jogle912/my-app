import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { API_URL, APP_SCHEME } from "./config";

/**
 * Sign-in for the app. The session is kept in the phone's secure storage (Keychain / Keystore),
 * never in plain storage, and sent to our API as a cookie header.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoClient({ scheme: APP_SCHEME, storagePrefix: APP_SCHEME, storage: SecureStore })],
});
