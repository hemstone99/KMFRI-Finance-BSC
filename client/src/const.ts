export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  if (!oauthPortalUrl || !appId) {
    return `${window.location.origin}/login`;
  }

  try {
    const url = new URL("/app-auth", oauthPortalUrl);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", btoa(redirectUri));
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (error) {
    console.error("Invalid OAuth portal URL", oauthPortalUrl, error);
    return `${window.location.origin}/login`;
  }
};
