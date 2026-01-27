package com.example.clockin

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.util.Log

object WifiChecker {

    // REPLACE WIFI SSID on ALLOWED_WIFI_SSID
    private const val ALLOWED_WIFI_SSID = "PLDTHOMEFIBR5G38e90"

    fun isConnectedToAllowedWifi(context: Context): Boolean {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            ?: return false

        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false

        if (!wifiManager.isWifiEnabled) {
            Log.e("WifiChecker", "WiFi is not enabled")
            return false
        }

        val network = connectivityManager.activeNetwork
        if (network == null) {
            Log.e("WifiChecker", "No active network")
            return false
        }

        val capabilities = connectivityManager.getNetworkCapabilities(network)
        if (capabilities == null) {
            Log.e("WifiChecker", "No network capabilities")
            return false
        }

        if (!capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
            Log.e("WifiChecker", "Not connected to WiFi")
            return false
        }

        val wifiInfo = wifiManager.connectionInfo
        val currentSsid = wifiInfo.ssid
        val cleanSsid = currentSsid.replace("\"", "")

        Log.d("WifiChecker", "Current SSID: $cleanSsid, Required: $ALLOWED_WIFI_SSID")

        return cleanSsid.equals(ALLOWED_WIFI_SSID, ignoreCase = true)
    }

    fun getCurrentWifiSsid(context: Context): String? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            ?: return null

        if (!wifiManager.isWifiEnabled) {
            return null
        }

        val wifiInfo = wifiManager.connectionInfo
        val ssid = wifiInfo.ssid

        return if (ssid == "<unknown ssid>" || ssid.isEmpty()) {
            null
        } else {
            ssid.replace("\"", "")
        }
    }

    fun isWifiEnabled(context: Context): Boolean {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            ?: return false
        return wifiManager.isWifiEnabled
    }

    fun getAllowedWifiSsid(): String {
        return ALLOWED_WIFI_SSID
    }
}