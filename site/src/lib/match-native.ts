export async function initMatchNativeShell(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0a0505" });

    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 280 });

    const { App } = await import("@capacitor/app");
    App.addListener("appStateChange", ({ isActive }) => {
      document.documentElement.dataset.appActive = isActive ? "1" : "0";
    });
  } catch {
    /* web only */
  }
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}
