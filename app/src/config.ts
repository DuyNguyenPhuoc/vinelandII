// Runtime config. The Google OAuth Client ID is supplied by the user via a Vite
// env var (.env.local → VITE_GOOGLE_CLIENT_ID). Without it, Drive features are
// disabled and the app falls back to local .json download/upload.
export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";

export const APP_VERSION = "0.1.0";

// drive.file = the app can only see/manage files it created. Least-privilege.
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
