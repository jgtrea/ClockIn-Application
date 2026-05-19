package com.example.clockin

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build

object WifiChecker {

    // REPLACE WIFI WITH CORRECT SSID
    private const val ALLOWED_WIFI_SSID = "YOUR_WIFI_NAME_HERE"

    fun isWifiEnabled(context: Context): Boolean {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        return wifiManager.isWifiEnabled
    }

    fun isConnectedToAllowedWifi(context: Context): Boolean {
        val currentSsid = getCurrentWifiSsid(context) ?: return false
        val cleanSsid = currentSsid.replace("\"", "")
        return cleanSsid == ALLOWED_WIFI_SSID
    }

    fun getCurrentWifiSsid(context: Context): String? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = connectivityManager.activeNetwork ?: return null
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return null
            
            if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                val wifiInfo = capabilities.transportInfo as? android.net.wifi.WifiInfo
                return wifiInfo?.ssid
            }
            return null
        } else {
            @Suppress("DEPRECATION")
            val info = wifiManager.connectionInfo
            if (info.networkId == -1) return null
            return info.ssid
        }
    }

    fun getAllowedWifiSsid(): String {
        return ALLOWED_WIFI_SSID
    }
}