package com.example.clockin.ui.theme

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

object ThemeManager {
    var isDarkTheme by mutableStateOf(false)
        private set

    private var initialized = false

    fun init(context: Context) {
        if (initialized) return
        val prefs = context.getSharedPreferences("theme_prefs", Context.MODE_PRIVATE)
        val defaultDark = (context.resources.configuration.uiMode and 
            android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
        isDarkTheme = prefs.getBoolean("is_dark_theme", defaultDark)
        initialized = true
    }

    fun toggleTheme(context: Context) {
        isDarkTheme = !isDarkTheme
        val prefs = context.getSharedPreferences("theme_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("is_dark_theme", isDarkTheme).apply()
    }
}
