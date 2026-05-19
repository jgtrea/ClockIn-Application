# ClockIn App — Code Review

## 🐛 Bugs & Problems

### 1. API Key Hardcoded in Source (`SupabaseManager.kt:102`)
```kotlin
private const val SUPABASE_KEY = "eyJhbGci..."
```
Anon key is committed to Git. Anyone with repo access can hit your Supabase project. Move to `local.properties` + `BuildConfig`, or at minimum add to `.gitignore` as env var.

---

### 2. Passwords Stored in Plaintext (`MainActivity.kt:507–508`)
```kotlin
newMap[emailInput] = passwordInput
val saveString = newMap.entries.joinToString(",") { "${it.key}|${it.value}" }
prefs.edit().putString("saved_accounts", saveString).apply()
```
Password saved to SharedPreferences in plain text. If device is rooted or backed up, credentials are exposed. **Drop this entirely** — Supabase session tokens should handle auto-login.

---

### 3. `ALLOWED_WIFI_SSID` is Empty String (`WifiChecker.kt:9`)
```kotlin
private const val ALLOWED_WIFI_SSID = ""
```
WiFi check will always fail (`cleanSsid == ""` is never true for a real network). Every QR scan will be blocked with "Wrong WiFi". **Must be configured.**

---

### 4. `BluetoothAdapter.getDefaultAdapter()` is Deprecated (`MainActivity.kt:178`)
```kotlin
val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
```
Deprecated since API 31. Use `context.getSystemService(BluetoothManager::class.java).adapter` instead.

---

### 5. `runBlocking` on Main Thread (`MainActivity.kt:304`)
```kotlin
val user = kotlinx.coroutines.runBlocking { SupabaseManager.getCurrentUser() }
```
`runBlocking` on the main/UI thread = ANR risk. Already inside a callback — just use `scope.launch` or pass the user in from a higher scope.

---

### 6. Leaked `CoroutineScope` on Logout (`MainActivity.kt:316–321`)
```kotlin
val scope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main)
scope.launch { ... }
```
Fire-and-forget scope with no lifecycle — it leaks. Use `rememberCoroutineScope()` at composition level or `lifecycleScope`.

---

### 7. Hardcoded 1-Hour Class Duration (`BeaconService.kt:209`)
```kotlin
val classEndTime = classStartTime + (60 * 60 * 1000) // Assumed 1hr
```
If any class is longer or shorter, overtime detection is wrong. `Schedule` already has `endTime` — use it instead of this assumption.

---

### 8. `startRawScan()` Does Nothing (`BeaconService.kt:89–92`)
```kotlin
rawScanner?.startScan(object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult?) {
        super.onScanResult(callbackType, result)  // empty
    }
})
```
Raw BLE scan runs but does zero work. Just wastes battery. Either remove it or handle results.

---

### 9. `processedAbsentCache` Not Thread-Safe (`SupabaseManager.kt:105`)
```kotlin
private val processedAbsentCache = mutableSetOf<String>()
```
`mutableSetOf()` is not thread-safe. Multiple coroutines can write concurrently. Use `Collections.synchronizedSet()` or `ConcurrentHashMap.newKeySet()`.

---

### 10. `NotificationListener` Polls Every 10s — No Cancellation
```kotlin
while (true) { ... delay(10000) }
```
Loop runs forever after login. No mechanism to stop it on logout. On re-login a second loop will also start. Use a `StateFlow` or cancel the job on logout.

---

### 11. Duplicate Dependency (`build.gradle.kts:63,65`)
```kotlin
implementation("androidx.compose.material:material-icons-extended:1.7.8")
// ...
implementation("androidx.compose.material:material-icons-extended:1.7.6")
```
Same artifact declared twice with different versions. Gradle picks one but it's confusing and can cause subtle issues.

---

### 12. `WifiChecker` Uses Deprecated `WifiManager.connectionInfo` API
`wifiManager.connectionInfo` deprecated in API 31. Use `ConnectivityManager` + `NetworkCapabilities` for API 29+ to get SSID correctly.

---

### 13. `ScannerScreen` Does WiFi/Beacon Check Twice
Checks happen in `onQrCodeDetected` callback AND again inside `SupabaseManager.verifyQrCode()`. Redundant, but not broken.

---

### 14. No Input Validation on Password Reset (`ResetPassword.kt`)
*(Not shown but pattern inferred)* Password field likely has no minimum length or strength check before calling `updateUserPassword`.

---

## 🚀 Improvement Ideas

### Architecture
- **Adopt MVVM** — all `SupabaseManager` calls happen inside Composables/callbacks. Extract to `ViewModel` + `StateFlow`. State survives rotation, easier to test.
- **Move data classes to a `model/` package** — they're scattered across `SupabaseManager.kt` and `NotificationListener.kt`.

### Security
- **Remove plaintext password caching** entirely. Use Supabase session persistence which is already enabled (`loadFromStorage()`).
- **Move Supabase anon key to `local.properties`** and expose via `BuildConfig`.
- **Enable ProGuard for release** — `isMinifyEnabled = false` means your code ships unobfuscated.

### UX / Features
- **Offline mode indicator** — show a banner when network is unavailable so users understand why QR scan fails.
- **Pull-to-refresh on Dashboard** — currently only refreshes on `ON_RESUME`. Add `SwipeRefresh` or `PullToRefreshBox`.
- **Attendance history filter** — filter by date range, status (Present/Late/Absent).
- **Push notifications** — replace the polling loop with Firebase Cloud Messaging (FCM) for real-time, battery-efficient notifications.
- **Dark mode support** — `Theme.kt` exists but app forces `Color.White` backgrounds everywhere.
- **Beacon distance visualization** — show a visual proximity indicator (e.g., pulsing circle) instead of raw distance text.
- **Toast/Snackbar feedback** on actions like marking absent.

### Code Quality
- **Extract color constants to `Color.kt`** — colors like `Color(0xFFFF7F66)` appear in 6+ files. Some are already in `MainActivity.kt` as top-level vals but not used everywhere.
- **Replace deprecated `SimpleDateFormat`** with `java.time` APIs (available since `minSdk = 26`).
- **Add `contentDescription` to all `Icon()` calls** — many pass `null`, breaking accessibility.
- **FAQView has only 2 hardcoded items** — FAQ content should be data-driven.
