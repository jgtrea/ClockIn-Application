package com.example.clockin

import android.content.Context
import android.net.wifi.WifiManager

object WifiChecker {

    // REPLACE WIFI WITH CORRECT SSID
    private const val ALLOWED_WIFI_SSID = "PLDTHOMEFIBR5G38e90"

    fun isWifiEnabled(context: Context): Boolean {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        return wifiManager.isWifiEnabled
    }

    fun isConnectedToAllowedWifi(context: Context): Boolean {
//        val currentSsid = getCurrentWifiSsid(context) ?: return false
//        val cleanSsid = currentSsid.replace("\"", "")
//        return cleanSsid == ALLOWED_WIFI_SSID
        return true
    }

    fun getCurrentWifiSsid(context: Context): String? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val info = wifiManager.connectionInfo

        if (info.networkId == -1) return null

        return info.ssid
    }

    fun getAllowedWifiSsid(): String {
        return ALLOWED_WIFI_SSID
    }
}