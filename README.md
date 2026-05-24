# ClockIn - Employee Attendance System

![Kotlin](https://img.shields.io/badge/Kotlin-2.0.21-purple?style=flat&logo=kotlin)
![Android Studio](https://img.shields.io/badge/Android-Koala%20%2B-green?style=flat&logo=android)
![Compose](https://img.shields.io/badge/Jetpack-Compose-blue?style=flat&logo=jetpackcompose)
![Supabase](https://img.shields.io/badge/Database-Supabase-emerald?style=flat&logo=supabase)
![ktlint](https://img.shields.io/badge/Linter-ktlint-orange?style=flat)

**ClockIn** is a modern Android application built with **Kotlin** and **Jetpack Compose** that streamlines employee attendance tracking. It utilizes a strict **3-Factor Verification System** (QR Code + WiFi + BLE Proximity) to ensure secure, location-verified, and accurate logging of work hours.

---

## 🚀 Key Features

*   **Secure Authentication:** User login and session management powered by Supabase Auth.
*   **🔒 3-Factor Verification:**
    1.  **WiFi SSID Restriction:** Clock-in is blocked unless connected to the designated office network SSID.
    2.  **BLE Proximity Beacon:** Detects room-specific Bluetooth Beacons dynamically assigned to the schedule.
    3.  **Encrypted QR Code:** Scan room/session specific QR codes to successfully finalize clock-in/out.
*   **⚡ Smart Attendance Logic:**
    *   **Auto-State Toggle:** Swaps automatically between "Clock In" and "Clock Out" based on live status.
    *   **Dynamic Grace Period:** Dynamically queries the Supabase `grace_period` database table for active limits and computes lateness precisely via float minutes (`minutes + (seconds / 60)`).
    *   **Duplicate Prevention:** Strictly blocks multiple check-ins for the same scheduled session.
*   **📅 Dynamic Dashboard:**
    *   **Happening Now:** Dynamically locks onto current active classes and starts BLE beacon tracking for the specific room.
    *   **Upcoming Schedule:** Sorted chronological view of the weekly schedule.
    *   **Flicker-Free Silent updates:** Background announcements polling updates silently and seamlessly to prevent annoying UI flashes.
*   **🌓 Theme Preferences:** Supports manual light and dark theme toggling with instant persistence inside Android SharedPreferences.
*   **📡 Offline Mode Indicator:** Real-time sliding warning banner at the top of all main screens that reactively alerts the user when internet connection is lost.

---

## 🛠️ Tech Stack

*   **Language:** Kotlin
*   **UI Architecture:** Jetpack Compose (Material 3 UI, single-activity state-driven architecture)
*   **Backend & DB:** Supabase (Auth, PostgreSQL DB, Session Persistence)
*   **Network:** Ktor Client & kotlinx-serialization
*   **Hardware / Core APIs:**
    *   **CameraX & ML Kit:** High-speed barcode/QR code parsing.
    *   **Android Bluetooth LE (AltBeacon):** Proximity tracking & distance math.
    *   **WifiManager:** For localized SSID inspection.
*   **Concurrency:** Kotlin Coroutines & Flows (asynchronous thread isolation via `Dispatchers.IO`).
*   **Linter & Code Quality:** ktlint (Jlleitschuh Gradle integration)

---

## 📦 Getting Started

### Prerequisites
*   Android Studio (Koala/Ladybug or newer recommended).
*   A physical Android device (BLE and WiFi checks cannot be accurately run on an emulator).
*   A configured Supabase project.

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/SuperficialFlow/ClockIn-Application-Demo.git
    ```

2.  **Configure Supabase Project**
    *   Navigate to your [Supabase Dashboard](https://supabase.com/dashboard).
    *   Copy your `Project URL` and `anon public` Key from **Project Settings** -> **API**.
    *   Open `local.properties` in your project's root folder and append your credentials securely:
        ```properties
        supabase.url=YOUR_SUPABASE_URL
        supabase.key=YOUR_SUPABASE_ANON_KEY
        ```
        > [!TIP]
        > This project strictly adheres to **OWASP Mobile Security standards (M1)**. Secrets are safely loaded via Gradle from `local.properties` and injected into `BuildConfig` dynamically, preventing any credential leakage or exposure in source control repositories.

3.  **Build and Run**
    *   Open the project root inside Android Studio.
    *   Ensure a physical device with **USB Debugging** enabled is connected.
    *   Sync Gradle files and click **Run**.

---

## 🎨 Code Quality & Styling

This project enforces strict Kotlin formatting rules using **ktlint** and a custom `.editorconfig` (optimized for Jetpack Compose naming conventions).

*   **Check code styling issues:**
    ```bash
    ./gradlew ktlintCheck
    ```
*   **Auto-format codebase:**
    ```bash
    ./gradlew ktlintFormat
    ```

---

## ⚙️ Configuration

### WiFi Restriction
The allowed SSID is managed dynamically inside `WifiChecker.kt`. It defaults to `ClockIn_WiFi` but is dynamically read and saved using SharedPreferences:
```kotlin
object WifiChecker {
    private const val DEFAULT_WIFI_SSID = "ClockIn_WiFi"
}
```
You can dynamically register your organization's designated WiFi SSID using:
```kotlin
WifiChecker.setAllowedWifiSsid(context, "YOUR_OFFICE_WIFI_NAME")
```
