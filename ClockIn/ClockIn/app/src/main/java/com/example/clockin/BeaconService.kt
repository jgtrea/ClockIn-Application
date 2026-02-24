package com.example.clockin

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import org.altbeacon.beacon.Beacon
import org.altbeacon.beacon.BeaconManager
import org.altbeacon.beacon.Region

class BeaconService : Service() {

    private val binder = LocalBinder()
    private var beaconManager: BeaconManager? = null
    private var serviceScope = CoroutineScope(Dispatchers.Default + Job())
    private var rawScanner: android.bluetooth.le.BluetoothLeScanner? = null

    // --- STATE VARIABLES ---
    var currentDistance: Double = 0.0
        private set
    var isBeaconFound: Boolean = false
        private set
    var remainingTime: Long = 300L
        private set
    var statusMessage: String = "Initializing..."
        private set

    private var targetBeaconName: String = ""
    private var classStartTime: Long = 0L
    private var scheduleId: String = ""
    private var employeeId: String = ""
    private var isClockedIn: Boolean = false

    private var isMarkedIncomplete: Boolean = false
    var onUpdate: ((Double, Boolean, Long, String) -> Unit)? = null

    private val SAFE_DISTANCE = 8.0
    private val NOTIFICATION_ID = 123
    private val CHANNEL_ID = "AttendanceChannel"
    private val GRACE_PERIOD_MS = 15 * 60 * 1000
    private val PREFS_NAME = "BeaconPrefs"

    inner class LocalBinder : Binder() {
        fun getService(): BeaconService = this@BeaconService
    }

    override fun onBind(intent: Intent): IBinder {
        return binder
    }

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification("Initializing...", "Waiting for beacon..."))
        setupBeaconManager()
        startRawScan()
        startTimerLoop()
    }

    private fun setupBeaconManager() {
        beaconManager = BeaconManager.getInstanceForApplication(this)
        beaconManager?.beaconParsers?.clear()
        beaconManager?.beaconParsers?.add(org.altbeacon.beacon.BeaconParser().setBeaconLayout(org.altbeacon.beacon.BeaconParser.ALTBEACON_LAYOUT))
        beaconManager?.beaconParsers?.add(org.altbeacon.beacon.BeaconParser().setBeaconLayout(org.altbeacon.beacon.BeaconParser.EDDYSTONE_UID_LAYOUT))
        beaconManager?.beaconParsers?.add(org.altbeacon.beacon.BeaconParser().setBeaconLayout(org.altbeacon.beacon.BeaconParser.EDDYSTONE_URL_LAYOUT))
        beaconManager?.beaconParsers?.add(org.altbeacon.beacon.BeaconParser().setBeaconLayout("m:2-3=0215,i:4-19,i:20-21,i:22-23,p:24-24"))

        beaconManager?.foregroundScanPeriod = 1100L
        beaconManager?.foregroundBetweenScanPeriod = 0L
        beaconManager?.backgroundScanPeriod = 1100L
        beaconManager?.backgroundBetweenScanPeriod = 0L
    }

    @SuppressLint("MissingPermission")
    private fun startRawScan() {
        try {
            val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            rawScanner = bluetoothManager.adapter.bluetoothLeScanner
            rawScanner?.startScan(object : ScanCallback() {
                override fun onScanResult(callbackType: Int, result: ScanResult?) {
                    super.onScanResult(callbackType, result)
                }
            })
        } catch (e: SecurityException) {
            Log.e("BeaconService", "Missing Bluetooth scan permission! Cannot start raw scan.", e)
            statusMessage = "Missing Bluetooth Permissions"
        } catch (e: Exception) {
            Log.e("BeaconService", "Error starting raw scan", e)
        }
    }

    fun startMonitoring(beaconName: String, startTimeMillis: Long, schedId: String, empId: String, clockedIn: Boolean) {
        Log.d("DEBUG_CLOCKIN", "Service START: Name=$beaconName, ClockedIn=$clockedIn")

        if (beaconName.isBlank()) {
            stopMonitoring()
            return
        }

        targetBeaconName = beaconName
        classStartTime = startTimeMillis
        scheduleId = schedId
        employeeId = empId
        isClockedIn = clockedIn

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        if (!isClockedIn) {
            prefs.edit()
                .remove("deadline_$schedId")
                .remove("incomplete_$schedId")
                .apply()
            isMarkedIncomplete = false
        } else {
            val savedIncomplete = prefs.getBoolean("incomplete_$schedId", false)
            if (savedIncomplete) {
                isMarkedIncomplete = true
                statusMessage = "Marked Incomplete"
            }
        }

        if (!isMarkedIncomplete && !isBeaconFound) {
            remainingTime = 300L
            statusMessage = if (isClockedIn) "Monitoring: $beaconName" else "Searching for Beacon (Pre-Clock In)..."
        }

        try {
            val region = Region("ClassRegion", null, null, null)
            beaconManager?.startRangingBeacons(region)
            beaconManager?.removeAllRangeNotifiers()
            beaconManager?.addRangeNotifier { beacons, _ ->
                processBeacons(beacons)
            }
        } catch (e: SecurityException) {
            Log.e("BeaconService", "SecurityException starting BeaconManager", e)
            statusMessage = "Missing Bluetooth Permissions"
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun stopMonitoring() {
        Log.d("DEBUG_CLOCKIN", "Service STOP Called")

        targetBeaconName = ""
        classStartTime = 0L
        isBeaconFound = false
        remainingTime = 300L
        isMarkedIncomplete = false
        isClockedIn = false
        statusMessage = "Idle"
        beaconManager?.removeAllRangeNotifiers()
        updateNotification("Idle", "No active class")
        onUpdate?.invoke(0.0, false, 300L, "Idle")
    }

    private fun processBeacons(beacons: Collection<Beacon>) {
        if (targetBeaconName.isEmpty()) return

        val foundBeacon = beacons.firstOrNull { beacon ->
            val name = beacon.bluetoothName ?: ""
            val address = beacon.bluetoothAddress ?: ""
            name.equals(targetBeaconName, ignoreCase = true) || address.equals(targetBeaconName, ignoreCase = true)
        }

        if (foundBeacon != null) {
            currentDistance = foundBeacon.distance
            isBeaconFound = currentDistance <= SAFE_DISTANCE
        } else {
            isBeaconFound = false
        }
    }

    private fun startTimerLoop() {
        serviceScope.launch {
            while (isActive) {
                delay(1000L)

                if (targetBeaconName.isNotEmpty()) {
                    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

                    if (prefs.getBoolean("incomplete_$scheduleId", false)) {
                        isMarkedIncomplete = true
                        statusMessage = "Marked Incomplete"
                        updateNotification("Attendance Failed", "Marked Incomplete (Out of Range)")
                        withContext(Dispatchers.Main) {
                            onUpdate?.invoke(0.0, false, 0L, "Status: Incomplete")
                        }
                        continue
                    }

                    val now = System.currentTimeMillis()
                    val gracePeriodEnd = classStartTime + GRACE_PERIOD_MS
                    val isPastGracePeriod = now > gracePeriodEnd

                    val distStr = "%.2f m".format(currentDistance)
                    val graceMillisLeft = if (gracePeriodEnd > now) gracePeriodEnd - now else 0L
                    val graceTimeStr = formatTime(graceMillisLeft / 1000)

                    if (isPastGracePeriod && isClockedIn) {
                        if (!isBeaconFound) {
                            var deadline = prefs.getLong("deadline_$scheduleId", 0L)
                            if (deadline == 0L) {
                                deadline = now + 300000L
                                prefs.edit().putLong("deadline_$scheduleId", deadline).apply()
                            }

                            val millisLeft = deadline - now
                            remainingTime = millisLeft / 1000

                            statusMessage = "OUT OF RANGE! ${formatTime(remainingTime)} (Dist: $distStr)"
                            updateNotification("WARNING: Beacon Lost!", "Time: ${formatTime(remainingTime)} - Dist: $distStr")

                            if (remainingTime <= 0) {
                                isMarkedIncomplete = true
                                prefs.edit().putBoolean("incomplete_$scheduleId", true).apply()
                                statusMessage = "Marked Incomplete"
                                markIncompleteInDb()
                            }
                        } else {
                            prefs.edit().remove("deadline_$scheduleId").apply()
                            remainingTime = 300L

                            statusMessage = "Connected (Dist: $distStr)"
                            updateNotification("Connected: $targetBeaconName", "Dist: $distStr")
                        }
                    } else {
                        if (isBeaconFound) {
                            statusMessage = "Beacon Found (Dist: $distStr). Grace Period: $graceTimeStr"
                            updateNotification("Beacon Found", "Ready for Clock In")
                        } else {
                            statusMessage = "Searching (Dist: $distStr)... Grace Period: $graceTimeStr"
                            updateNotification("Searching...", "Looking for $targetBeaconName")
                        }
                    }

                    withContext(Dispatchers.Main) {
                        onUpdate?.invoke(currentDistance, isBeaconFound, remainingTime, statusMessage)
                    }
                }
            }
        }
    }

    private fun markIncompleteInDb() {
        if (scheduleId.isNotEmpty() && employeeId.isNotEmpty()) {
            serviceScope.launch(Dispatchers.IO) {
                SupabaseManager.markIncomplete(scheduleId, employeeId)
            }
        }
    }

    private fun createNotification(title: String, content: String): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Attendance Monitoring", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_popup_sync)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun updateNotification(title: String, content: String) {
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, createNotification(title, content))
    }

    private fun formatTime(seconds: Long): String {
        if (seconds < 0) return "00:00"
        val m = seconds / 60
        val s = seconds % 60
        return "%02d:%02d".format(m, s)
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        beaconManager?.removeAllRangeNotifiers()
        try {
            @SuppressLint("MissingPermission")
            rawScanner?.stopScan(object : ScanCallback() {})
        } catch (e: SecurityException) {
            Log.e("BeaconService", "SecurityException stopping scan", e)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}