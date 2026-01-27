#  ClockIn - Employee Attendance System

**ClockIn** is a modern Android application built with **Kotlin** and **Jetpack Compose** that streamlines employee attendance tracking. It utilizes **QR Code scanning**, **Bluetooth Low Energy (BLE) beacons**, and **WiFi SSID restrictions** to ensure secure and accurate logging of work hours.

---

##  Features

* ** Secure Authentication:** Employee login using Firebase Authentication.
* ** QR Code Clock-In/Out:**
    * Scans secure QR codes to log attendance.
    * **Smart Logic:** Automatically toggles between "Clock In" and "Clock Out".
    * **Late Detection:** Automatically marks attendance as "Late" if clocked in >15 minutes after start time.
    * **Prevents Double Scanning:** Rejects scans if a session is already "Completed".
* ** Location Verification:**
    * **WiFi Restriction:** Clock-in is only allowed when connected to a specific Office WiFi network.
    * **BLE Proximity:** Detects nearby Bluetooth Beacons to verify room presence.
* ** Schedule & History:** View weekly schedules and past attendance records with status badges (Present/Late).
* ** Notifications:** Real-time announcements from the admin.
* ** Profile Management:** View employee details and logout capability.

---

## 🛠 Tech Stack

* **Language:** Kotlin
* **UI Framework:** Jetpack Compose (Material3)
* **Backend:** Firebase (Firestore & Authentication)
* **Hardware Integration:**
    * **CameraX & ML Kit:** For high-speed QR code scanning.
    * **Android Bluetooth LE:** For beacon proximity detection.
    * **WifiManager:** For SSID security checks.
* **Concurrency:** Kotlin Coroutines (`Dispatchers.IO` for optimized performance).

---

##  Getting Started

### Prerequisites

* Android Studio (Koala or newer recommended).
* A physical Android device (Emulator cannot test Bluetooth/WiFi features accurately).
* Firebase Project setup.

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/ClockIn.git](https://github.com/yourusername/ClockIn.git)
    ```

2.  **Firebase Setup**
    * Go to the [Firebase Console](https://console.firebase.google.com/).
    * Create a project and add an Android App.
    * Download the `google-services.json` file.
    * Place the file in the `app/` directory of the project:
        ```text
        ClockIn/
        ├── app/
        │   ├── google-services.json  <-- PLACE HERE
        │   ├── src/
        │   └── build.gradle.kts
        ```

3.  **Build and Run**
    * Open the project in Android Studio.
    * Sync Gradle files.
    * Connect your device via USB and click **Run**.

---

##  Configuration

### 1. WiFi Restriction
The app strictly enforces clock-in only on a specific WiFi network. To change the allowed WiFi, open `com/example/clockin/WifiChecker.kt`:

```kotlin
object WifiChecker {
    // Change this to your office WiFi name
    private const val ALLOWED_WIFI_SSID = "YOUR_OFFICE_WIFI_NAME" 
    ...
}
