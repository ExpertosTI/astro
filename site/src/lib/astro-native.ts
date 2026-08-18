"use client";

/** Native shell bridge & device capabilities integration for ASTRO Capacitor App */

export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Dynamic check via Capacitor window object or window.Capacitor
    const Capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return Boolean(Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

/** Native Haptic Feedback with Web Vibrate fallback */
export async function triggerNativeHaptic(
  type: "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection" = "light"
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
      switch (type) {
        case "light":
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case "medium":
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case "heavy":
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case "success":
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case "warning":
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case "error":
          await Haptics.notification({ type: NotificationType.Error });
          break;
        case "selection":
          await Haptics.selectionChanged();
          break;
      }
      return;
    }
  } catch {
    /* fallback to web vibrate */
  }

  // Web vibration fallback
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      const pattern =
        type === "success"
          ? [30, 50, 30]
          : type === "error"
          ? [50, 100, 50]
          : type === "heavy"
          ? 40
          : 15;
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

/** Native Confirmation Dialog Popup */
export async function nativeConfirm(options: {
  title: string;
  message: string;
  okTitle?: string;
  cancelTitle?: string;
}): Promise<boolean> {
  void triggerNativeHaptic("warning");
  if (typeof window === "undefined") return false;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Dialog } = await import("@capacitor/dialog");
      const res = await Dialog.confirm({
        title: options.title,
        message: options.message,
        okButtonTitle: options.okTitle || "Confirmar",
        cancelButtonTitle: options.cancelTitle || "Cancelar",
      });
      if (res.value) void triggerNativeHaptic("success");
      return res.value;
    }
  } catch {
    /* fallback */
  }

  const confirmed = window.confirm(`${options.title}\n\n${options.message}`);
  if (confirmed) void triggerNativeHaptic("success");
  return confirmed;
}

/** Native Alert Dialog Popup */
export async function nativeAlert(options: {
  title: string;
  message: string;
  buttonTitle?: string;
}): Promise<void> {
  void triggerNativeHaptic("info" as any);
  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Dialog } = await import("@capacitor/dialog");
      await Dialog.alert({
        title: options.title,
        message: options.message,
        buttonTitle: options.buttonTitle || "Entendido",
      });
      return;
    }
  } catch {
    /* fallback */
  }

  window.alert(`${options.title}\n\n${options.message}`);
}

/** Native Prompt Dialog Popup */
export async function nativePrompt(options: {
  title: string;
  message: string;
  placeholder?: string;
  defaultText?: string;
}): Promise<string | null> {
  void triggerNativeHaptic("selection");
  if (typeof window === "undefined") return null;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Dialog } = await import("@capacitor/dialog");
      const res = await Dialog.prompt({
        title: options.title,
        message: options.message,
        inputPlaceholder: options.placeholder || "",
        inputText: options.defaultText || "",
        okButtonTitle: "Aceptar",
        cancelButtonTitle: "Cancelar",
      });
      if (res.cancelled) return null;
      return res.value;
    }
  } catch {
    /* fallback */
  }

  return window.prompt(`${options.title}\n\n${options.message}`, options.defaultText || "");
}

/** Request Native Notification Permissions (Push + Local) */
export async function requestNativeNotificationPermissions(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const localPerm = await LocalNotifications.requestPermissions();
      
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const pushPerm = await PushNotifications.requestPermissions();
      
      const granted = localPerm.display === "granted" || pushPerm.receive === "granted";
      if (granted) {
        await PushNotifications.register().catch(() => {});
      }
      return granted;
    }
  } catch {
    /* web fallback */
  }

  if (typeof Notification !== "undefined") {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }

  return false;
}

/** Trigger Real-Time Local Notification Popup */
export async function sendNativeNotification(options: {
  id?: number;
  title: string;
  body: string;
  extra?: Record<string, unknown>;
}): Promise<void> {
  void triggerNativeHaptic("success");
  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const notifId = options.id || Math.floor(Math.random() * 100000);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: options.title,
            body: options.body,
            schedule: { at: new Date(Date.now() + 100) },
            extra: options.extra || {},
          },
        ],
      });
      return;
    }
  } catch {
    /* web fallback */
  }

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(options.title, { body: options.body });
  }
}

/** Complete Native Shell Initialization */
export async function initAstroNativeShell(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    // 1. Status Bar Styling
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    await StatusBar.setBackgroundColor({ color: "#0a0505" }).catch(() => {});

    // 2. Hide Splash Screen smoothly
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 280 }).catch(() => {});

    // 3. Native App State & Back Button handling
    const { App } = await import("@capacitor/app");
    App.addListener("appStateChange", ({ isActive }) => {
      document.documentElement.dataset.appActive = isActive ? "1" : "0";
    });

    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });

    // 4. Request Push Notification Registration
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.checkPermissions().then(async (status) => {
      if (status.receive === "granted") {
        await PushNotifications.register().catch(() => {});
      }
    }).catch(() => {});

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      void sendNativeNotification({
        title: notification.title || "Notificación de ASTRO",
        body: notification.body || "",
        extra: notification.data,
      });
    });

  } catch (err) {
    console.warn("Native shell initialization notice:", err);
  }
}
