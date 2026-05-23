package com.example.clockin

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build

object WifiChecker {
    private var customSsid: String? = null
    private const val DEFAULT_WIFI_SSID = "ClockIn_WiFi"

    fun setAllowedWifiSsid(
        context: Context,
        ssid: String,
    ) {
        customSsid = ssid
        val prefs = context.getSharedPreferences("WifiPrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("allowed_ssid", ssid).apply()
    }

    fun getAllowedWifiSsid(
        context: Context? = null,
    ): String {
        customSsid?.let { return it }
        val prefs = context?.getSharedPreferences("WifiPrefs", Context.MODE_PRIVATE)
        val ssid = prefs?.getString("allowed_ssid", DEFAULT_WIFI_SSID) ?: DEFAULT_WIFI_SSID
        customSsid = ssid
        return ssid
    }

    fun isWifiEnabled(context: Context): Boolean {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        return wifiManager.isWifiEnabled
    }

    fun isConnectedToAllowedWifi(context: Context): Boolean {
        val currentSsid = getCurrentWifiSsid(context) ?: return false
        val cleanSsid = currentSsid.replace("\"", "")
        return cleanSsid == getAllowedWifiSsid(context)
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
}
