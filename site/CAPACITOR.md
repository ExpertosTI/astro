# ASTRO Match — Android & iOS (Capacitor)

## Requisitos

- Node 20+
- Android Studio (Android)
- Xcode + CocoaPods (iOS, solo macOS)

## Build web + sync nativo

```bash
cd site
npm install
npm run cap:sync
```

## Android

```bash
npm run cap:android
# En Android Studio: Build → Generate Signed Bundle/APK
```

## iOS

```bash
npm run cap:ios
# En Xcode: selecciona team, firma, Run en dispositivo
```

## Push nativo

1. **Android**: configura Firebase Cloud Messaging y `google-services.json` en `android/app/`.
2. **iOS**: habilita Push Notifications + Background Modes en Xcode; sube APNs key a Apple Developer.
3. Los tokens se guardan en `match_push_tokens` vía PostgREST.

## PWA (web)

- Manifest: `/match-manifest.json`
- Service worker: `/match/sw.js` (scope `/match/`)
- En Perfil → activar notificaciones del sistema

## Schema DB (reacciones + push)

En el servidor:

```bash
cd /opt/astro
./scripts/apply-match-schema.sh
```
