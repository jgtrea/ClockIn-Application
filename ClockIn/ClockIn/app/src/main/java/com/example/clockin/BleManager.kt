package com.example.clockin

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import kotlin.math.pow

object BleManager {
    private const val TAG = "BleManager"
    private var currentScanCallback: ScanCallback? = null


    // ETO UNG DISTANCE NG BLE // NEED NETO NG RESEARCH KUNG GANO KALAYO UNG ACCEPTABLE
    private const val BLE_DISTANCE_LIMIT = 10.0
    private const val TX_POWER = -59

    @SuppressLint("MissingPermission")
    fun startScanning(
        context: Context,
        filterName: String,
        onBeaconFound: (String, Double, Boolean) -> Unit
    ) {
        val hasLocation = ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasScan = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        if (!hasLocation || !hasScan) return

        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val scanner = bluetoothManager?.adapter?.bluetoothLeScanner ?: return

        stopScanning(context)

        val newCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val name = result.device.name ?: ""

                if (name.trim().equals(filterName.trim(), ignoreCase = true)) {
                    val distance = calculateDistance(result.rssi)
                    val isWithinLimit = distance <= BLE_DISTANCE_LIMIT && distance > 0
                    onBeaconFound(name, distance, isWithinLimit)
                }
            }

            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "Scan failed: $errorCode")
            }
        }

        currentScanCallback = newCallback
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
        scanner.startScan(null, settings, newCallback)
    }

    @SuppressLint("MissingPermission")
    fun stopScanning(context: Context) {
        if (currentScanCallback == null) return
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val scanner = bluetoothManager?.adapter?.bluetoothLeScanner
        try {
            scanner?.stopScan(currentScanCallback)
            currentScanCallback = null
        } catch (e: Exception) { e.printStackTrace() }
    }

    private fun calculateDistance(rssi: Int): Double {
        if (rssi == 0) return -1.0
        val ratio = rssi * 1.0 / TX_POWER
        return if (ratio < 1.0) {
            ratio.pow(10.0)
        } else {
            (0.89976) * ratio.pow(7.7095) + 0.111
        }
    }
}