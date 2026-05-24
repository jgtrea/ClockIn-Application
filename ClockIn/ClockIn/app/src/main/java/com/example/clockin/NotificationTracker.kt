package com.example.clockin

import android.content.Context
import com.example.clockin.model.*

object NotificationTracker {
    private const val PREFS_NAME = "notification_tracker"
    private const val KEY_SHOWN_NOTIFICATIONS = "shown_notification_ids"

    private var shownNotificationIds = mutableSetOf<String>()

    fun init(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedIds = prefs.getStringSet(KEY_SHOWN_NOTIFICATIONS, emptySet()) ?: emptySet()
        shownNotificationIds = savedIds.toMutableSet()
    }

    fun hasBeenShown(notifId: String): Boolean {
        return shownNotificationIds.contains(notifId)
    }

    fun markAsShown(
        context: Context,
        notifId: String,
    ) {
        shownNotificationIds.add(notifId)
        saveToPreferences(context)
    }

    fun filterNewNotifications(notifications: List<NotificationItem>): List<NotificationItem> {
        return notifications.filter { !hasBeenShown(it.notifId) }
    }

    fun cleanup(context: Context) {
        if (shownNotificationIds.size > 100) {
            val keepIds = shownNotificationIds
            shownNotificationIds = keepIds
            saveToPreferences(context)
        }
    }

    private fun saveToPreferences(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putStringSet(KEY_SHOWN_NOTIFICATIONS, shownNotificationIds).apply()
    }
}
