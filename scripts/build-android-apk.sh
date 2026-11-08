#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/mobile"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

if [[ ! -d "$ANDROID_HOME" ]]; then
  echo "ANDROID_HOME missing: $ANDROID_HOME" >&2
  exit 1
fi

API_URL="${EXPO_PUBLIC_API_URL:-http://10.0.2.2:3001}"
# 10.0.2.2 = Android emulator → host localhost
export EXPO_PUBLIC_API_URL="$API_URL"

echo "==> prebuild android"
npx expo prebuild --platform android --non-interactive

ANDROID_DIR="$ROOT/apps/mobile/android"

# Pin Kotlin (Expo/RN can disagree on 1.9.24 vs 1.9.25 and break Compose)
export ANDROID_DIR
python3 - <<'PY'
from pathlib import Path
import os
root = Path(os.environ["ANDROID_DIR"])
bg = root / "build.gradle"
t = bg.read_text()
t = t.replace(
    "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')",
    'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")',
)
bg.write_text(t)
gp = root / "gradle.properties"
gt = gp.read_text()
if "android.kotlinVersion" not in gt:
    gt = gt.replace(
        "android.useAndroidX=true",
        "android.useAndroidX=true\nandroid.kotlinVersion=1.9.25\nkotlin.version=1.9.25",
    )
    gp.write_text(gt)
print("kotlin pinned")
PY

# Ensure PackageList patch survives regenerateAutolinkingPackageList (pnpm quirk: expo.core)
APP_BG="$ANDROID_DIR/app/build.gradle"
if ! grep -q 'expo.core.ExpoModulesPackage' "$APP_BG"; then
  cat >> "$APP_BG" <<'EOF'

// Fix Expo SDK 52 PackageList import when autolinking emits legacy expo.core path (pnpm/RN CLI quirk).
tasks.configureEach { task ->
    if (task.name.contains("generateAutolinkingPackageList")) {
        task.doLast {
            def f = file("${project.buildDir}/generated/autolinking/src/main/java/com/facebook/react/PackageList.java")
            if (f.exists()) {
                def text = f.getText("UTF-8")
                def fixed = text.replace("expo.core.ExpoModulesPackage", "expo.modules.ExpoModulesPackage")
                if (text != fixed) {
                    f.write(fixed, "UTF-8")
                    println "Patched PackageList.java: expo.core -> expo.modules"
                }
            }
        }
    }
}
EOF
fi

echo "==> gradle assembleDebug (arm64)"
cd "$ANDROID_DIR"
ANDROID_DIR="$ANDROID_DIR" ./gradlew assembleDebug --no-daemon -PreactNativeArchitectures=arm64-v8a

# Belt-and-suspenders patch if generate ran after our doLast ordering quirk
PKG="$ANDROID_DIR/app/build/generated/autolinking/src/main/java/com/facebook/react/PackageList.java"
if [[ -f "$PKG" ]] && grep -q 'expo.core.ExpoModulesPackage' "$PKG"; then
  sed -i '' 's/expo\.core\.ExpoModulesPackage/expo.modules.ExpoModulesPackage/g' "$PKG"
  ./gradlew assembleDebug --no-daemon -PreactNativeArchitectures=arm64-v8a
fi

OUT="$ROOT/dist/dekanat-plus-debug.apk"
mkdir -p "$ROOT/dist"
cp app/build/outputs/apk/debug/app-debug.apk "$OUT"

echo "==> APK: $OUT"
ls -lh "$OUT"
