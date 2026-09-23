import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';

/**
 * OTA updates via EAS Update (expo-updates).
 *
 * Enabled only on native release builds: web deploys through Jenkins docker,
 * and dev mode talks to the local Metro bundler instead.
 *
 * Pipeline: git push -> Jenkins -> `eas update` (runs inside the server image,
 * which provides node/npm that the bare Jenkins agent lacks; the workspace is
 * bind-mounted via its host-side path).
 */
export function updatesEnabled(): boolean {
  return Platform.OS !== 'web' && !__DEV__;
}

/**
 * Check for a JS update on launch; if one exists, download it and prompt the
 * user to restart. Native-side changes (new modules, Info.plist) are NOT
 * covered — those still need a reinstall because the runtimeVersion bumps.
 */
export function checkForOtaUpdate(): void {
  if (!updatesEnabled()) return;
  (async () => {
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) return;
      await Updates.fetchUpdateAsync();
      Alert.alert(
        '更新就绪',
        '新版本已下载完成，重启应用后生效。',
        [
          { text: '稍后', style: 'cancel' },
          { text: '立即重启', onPress: () => void Updates.reloadAsync() },
        ],
        { cancelable: true },
      );
    } catch {
      // Network failures must never block the app from starting.
    }
  })();
}
