package com.example.clockin

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build

object WifiChecker {
    private var customSsid: String? = null
    private const val DEFAULT_WIFI_SSID = "PLDTHOMEFIBR5G38e90"

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
        val cleanSsid = currentSsid.replace("\"", "").trim()
        val allowedSsid = getAllowedWifiSsid(context).replace("\"", "").trim()

        if (cleanSsid.equals("<unknown ssid>", ignoreCase = true) ||
            cleanSsid.equals("unknown ssid", ignoreCase = true) ||
            cleanSsid.isEmpty()
        ) {
            return true
        }

        return cleanSsid.equals(allowedSsid, ignoreCase = true)
    }

    fun getCurrentWifiSsid(context: Context): String? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        var ssid: String? = null

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = connectivityManager.activeNetwork
            if (network != null) {
                val capabilities = connectivityManager.getNetworkCapabilities(network)
                if (capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                    val wifiInfo = capabilities.transportInfo as? android.net.wifi.WifiInfo
                    ssid = wifiInfo?.ssid
                }
            }
        }

        if (ssid == null || ssid.isEmpty() || ssid.equals("<unknown ssid>", ignoreCase = true) || ssid.equals("unknown ssid", ignoreCase = true)) {
            @Suppress("DEPRECATION")
            val info = wifiManager.connectionInfo
            if (info != null && info.networkId != -1) {
                ssid = info.ssid
            }
        }

        return ssid
    }
}
