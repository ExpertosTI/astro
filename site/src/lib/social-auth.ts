export type SocialProvider = "google" | "apple";

export type SocialProfile = {
  provider: SocialProvider;
  email: string;
  firstName: string;
  lastName: string;
  sub: string;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type AppleSignInResponse = {
  authorization?: { id_token?: string; code?: string };
  user?: {
    email?: string;
    name?: { firstName?: string; lastName?: string };
  };
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (cb?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          cancel: () => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<AppleSignInResponse>;
      };
    };
  }
}

const GOOGLE_SRC = "https://accounts.google.com/gsi/client";
const APPLE_SRC = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

function loadScript(src: string, id: string): Promise<void> {
  if (typeof document === "undefined") return Promise.reject(new Error("no-dom"));
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    if ((existing as HTMLScriptElement & { dataset: { ready?: string } }).dataset.ready === "1") {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed ${src}`)), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.ready = "1";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed ${src}`));
    document.head.appendChild(script);
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getSocialClientIds() {
  return {
    google: (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim(),
    apple: (process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "").trim(),
  };
}

export async function signInWithGoogle(): Promise<SocialProfile> {
  const clientId = getSocialClientIds().google;
  if (!clientId) {
    throw new Error("GOOGLE_NOT_CONFIGURED");
  }

  await loadScript(GOOGLE_SRC, "astro-google-gsi");

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.id) {
      reject(new Error("GOOGLE_SDK_MISSING"));
      return;
    }

    const timeout = window.setTimeout(() => reject(new Error("GOOGLE_TIMEOUT")), 45000);

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => {
        window.clearTimeout(timeout);
        const token = response.credential;
        if (!token) {
          reject(new Error("GOOGLE_NO_CREDENTIAL"));
          return;
        }
        const payload = decodeJwtPayload(token);
        if (!payload) {
          reject(new Error("GOOGLE_BAD_TOKEN"));
          return;
        }
        const email = String(payload.email || "").trim();
        const given = String(payload.given_name || "").trim();
        const family = String(payload.family_name || "").trim();
        const name = String(payload.name || "").trim();
        const parts = name.split(/\s+/).filter(Boolean);
        resolve({
          provider: "google",
          email,
          firstName: given || parts[0] || "",
          lastName: family || parts.slice(1).join(" ") || "",
          sub: String(payload.sub || ""),
        });
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        window.clearTimeout(timeout);
        reject(new Error("GOOGLE_CANCELLED"));
      }
    });
  });
}

export async function signInWithApple(): Promise<SocialProfile> {
  const clientId = getSocialClientIds().apple;
  if (!clientId) {
    throw new Error("APPLE_NOT_CONFIGURED");
  }

  await loadScript(APPLE_SRC, "astro-apple-auth");

  if (!window.AppleID?.auth) {
    throw new Error("APPLE_SDK_MISSING");
  }

  window.AppleID.auth.init({
    clientId,
    scope: "name email",
    redirectURI: typeof window !== "undefined" ? window.location.origin : "",
    usePopup: true,
  });

  const response = await window.AppleID.auth.signIn();
  const idToken = response.authorization?.id_token;
  const payload = idToken ? decodeJwtPayload(idToken) : null;
  const emailFromToken = payload ? String(payload.email || "").trim() : "";
  const email = (response.user?.email || emailFromToken || "").trim();
  const firstName = (response.user?.name?.firstName || "").trim();
  const lastName = (response.user?.name?.lastName || "").trim();

  return {
    provider: "apple",
    email,
    firstName,
    lastName,
    sub: payload ? String(payload.sub || "") : "",
  };
}
