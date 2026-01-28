package com.example.clockin

import android.content.Context
import android.content.SharedPreferences

/**
 * Tracks which notifications have already been shown to avoid duplicate toasts
 */
object NotificationTracker {
    private const val PREFS_NAME = "notification_tracker"
    private const val KEY_SHOWN_NOTIFICATIONS = "shown_notification_ids"

    private var shownNotificationIds = mutableSetOf<Int>()

    /**
     * Initialize the tracker with the app context
     * Call this once when the app starts
     */
    fun init(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedIds = prefs.getStringSet(KEY_SHOWN_NOTIFICATIONS, emptySet()) ?: emptySet()
        shownNotificationIds = savedIds.mapNotNull { it.toIntOrNull() }.toMutableSet()
    }

    /**
     * Check if a notification has already been shown
     */
    fun hasBeenShown(notifId: Int): Boolean {
        return shownNotificationIds.contains(notifId)
    }

    /**
     * Mark a notification as shown
     */
    fun markAsShown(context: Context, notifId: Int) {
        shownNotificationIds.add(notifId)
        saveToPreferences(context)
    }

    /**
     * Get list of new notifications from a list
     */
    fun filterNewNotifications(notifications: List<NotificationItem>): List<NotificationItem> {
        return notifications.filter { !hasBeenShown(it.notifId) }
    }

    /**
     * Clear all tracking (useful for testing or logout)
     */
    fun clear(context: Context) {
        shownNotificationIds.clear()
        saveToPreferences(context)
    }

    /**
     * Clear old notification IDs (keep only last 100)
     * Call this periodically to prevent unlimited growth
     */
    fun cleanup(context: Context) {
        if (shownNotificationIds.size > 100) {
            // Keep only the 100 most recent IDs
            val sortedIds = shownNotificationIds.sorted()
            shownNotificationIds = sortedIds.takeLast(100).toMutableSet()
            saveToPreferences(context)
        }
    }

    private fun saveToPreferences(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val idsAsStrings = shownNotificationIds.map { it.toString() }.toSet()
        prefs.edit().putStringSet(KEY_SHOWN_NOTIFICATIONS, idsAsStrings).apply()
    }
}