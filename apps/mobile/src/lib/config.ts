/**
 * Backend URL. Set EXPO_PUBLIC_API_URL for each build (see eas.json):
 *  - Android emulator talking to a server on your computer: http://10.0.2.2:3000
 *  - A real phone: the deployed server's https URL.
 * EXPO_PUBLIC_ values are bundled into the app, so never put secrets in them.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const APP_SCHEME = "studypilot";
