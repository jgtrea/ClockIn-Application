# ClockIn - Employee Attendance System

**ClockIn** is a modern Android application built with **Kotlin** and **Jetpack Compose** that streamlines employee attendance tracking. It utilizes a strict **3-Factor Verification System** (QR Code + WiFi + BLE Proximity) to ensure secure, location-verified, and accurate logging of work hours.

---

## Features

* **Secure Authentication:** Employee login using Supabase Authentication.
* **3-Factor Clock-In/Out:**
    * **1. WiFi Restriction:** Clock-in is only allowed when connected to the specific Office WiFi network.
    * **2. Dynamic BLE Proximity:** Automatically detects the specific Bluetooth Beacon assigned to the user's scheduled room.
    * **3. QR Code Scanning:** Scans secure QR codes to finalize the log.
* **Smart Attendance Logic:**
    * **Auto-Toggle:** Automatically switches between "Clock In" and "Clock Out" based on current status.
    * **Late Detection:** Automatically marks attendance as "Late" if clocked in >15 minutes after start time.
    * **Duplicate Prevention:** Rejects scans if a session is already "Completed" for the day.
* **Live Schedule Dashboard:**
    * **Happening Now:** Highlights the current active class and automatically configures the scanner for that specific room's beacon.
    * **Upcoming:** View weekly schedules sorted chronologically.
* **Notifications:** Real-time announcements from the admin.
* **Profile Management:** View employee details and logout capability.

---

## Tech Stack

* **Language:** Kotlin
* **UI Framework:** Jetpack Compose (Material3)
* **Backend:** Supabase (PostgreSQL & Authentication)
* **Networking:** Ktor Client & Kotlin Serialization
* **Hardware Integration:**
    * **CameraX & ML Kit:** For high-speed QR code scanning.
    * **Android Bluetooth LE:** For targeted beacon scanning (Low Latency).
    * **WifiManager:** For SSID security checks.
* **Concurrency:** Kotlin Coroutines (`Dispatchers.IO` for optimized performance).

---

## Getting Started

### Prerequisites

* Android Studio (Koala or newer recommended).
* A physical Android device (Emulator cannot test Bluetooth/WiFi features accurately).
* A Supabase Project setup.

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/ClockIn.git](https://github.com/yourusername/ClockIn.git)
    ```

2.  **Supabase Setup**
    * Go to the [Supabase Dashboard](https://supabase.com/dashboard).
    * Create a new project.
    * Navigate to **Project Settings** -> **API**.
    * Copy your `Project URL` and `anon public` Key.
    * Open `app/src/main/java/com/example/clockin/SupabaseManager.kt` and update the constants:
        ```kotlin
        object SupabaseManager {
            private const val SUPABASE_URL = "YOUR_SUPABASE_URL"
            private const val SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"
            ...
        }
        ```

3.  **Build and Run**
    * Open the project in Android Studio.
    * Sync Gradle files.
    * Connect your device via USB and click **Run**.

---

## Configuration

### 1. WiFi Restriction
The app hard-codes the allowed WiFi SSID for security. To change the allowed WiFi, open `com/example/clockin/WifiChecker.kt`:

```kotlin
object WifiChecker {
    // Change this to your office WiFi name (Case Sensitive)
    private const val ALLOWED_WIFI_SSID = "YOUR_OFFICE_WIFI_NAME" 
    ...
}
