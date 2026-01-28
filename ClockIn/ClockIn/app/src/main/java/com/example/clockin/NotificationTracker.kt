package com.example.clockin

import android.content.Context

object NotificationTracker {
    private const val PREFS_NAME = "notification_tracker"
    private const val KEY_SHOWN_NOTIFICATIONS = "shown_notification_ids"

    private var shownNotificationIds = mutableSetOf<Int>()

    fun init(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedIds = prefs.getStringSet(KEY_SHOWN_NOTIFICATIONS, emptySet()) ?: emptySet()
        shownNotificationIds = savedIds.mapNotNull { it.toIntOrNull() }.toMutableSet()
    }

    fun hasBeenShown(notifId: Int): Boolean {
        return shownNotificationIds.contains(notifId)
    }

    fun markAsShown(context: Context, notifId: Int) {
        shownNotificationIds.add(notifId)
        saveToPreferences(context)
    }

    fun filterNewNotifications(notifications: List<NotificationItem>): List<NotificationItem> {
        return notifications.filter { !hasBeenShown(it.notifId) }
    }

    fun clear(context: Context) {
        shownNotificationIds.clear()
        saveToPreferences(context)
    }

    fun cleanup(context: Context) {
        if (shownNotificationIds.size > 100) {
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