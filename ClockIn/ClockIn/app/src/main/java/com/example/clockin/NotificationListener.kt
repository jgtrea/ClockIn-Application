package com.example.clockin

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.delay

/**
 * Background notification listener that checks for new notifications periodically
 * Place this at the app level to continuously monitor for new notifications
 *
 * @param checkIntervalMs How often to check for new notifications (default: 30 seconds)
 * @param enabled Whether the listener is active (default: true when user is logged in)
 */
@Composable
fun NotificationListener(
    checkIntervalMs: Long = 30000L, // 30 seconds
    enabled: Boolean = true
) {
    val context = LocalContext.current
    var lastCheckTime by remember { mutableStateOf(System.currentTimeMillis()) }

    LaunchedEffect(enabled) {
        if (!enabled) return@LaunchedEffect

        while (enabled) {
            try {
                // Check if user is logged in
                if (FirebaseEmployeeManager.isLoggedIn()) {
                    // Fetch latest notifications from Firebase
                    val notifications = FirebaseEmployeeManager.getNotifications()

                    // Filter for only new notifications
                    val newNotifications = NotificationTracker.filterNewNotifications(notifications)

                    // Show each new notification
                    newNotifications.forEach { notif ->
                        NotificationManager.show(
                            header = notif.header,
                            message = notif.message,
                            duration = 5000L
                        )

                        // Mark as shown
                        NotificationTracker.markAsShown(context, notif.notifId)
                    }

                    lastCheckTime = System.currentTimeMillis()
                }
            } catch (e: Exception) {
                // Silently handle errors to prevent crashes
                android.util.Log.e("NotificationListener", "Error checking notifications", e)
            }

            // Wait before next check
            delay(checkIntervalMs)
        }
    }
}

/**
 * Alternative: Real-time notification listener using Firebase listeners
 * This provides instant notifications without polling
 *
 * Usage: Place in MainActivity after user logs in
 */
@Composable
fun RealtimeNotificationListener() {
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        if (!FirebaseEmployeeManager.isLoggedIn()) return@LaunchedEffect

        try {
            // Set up Firebase realtime listener
            val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()

            db.collection("notifications")
                .orderBy("dateCreated", com.google.firebase.firestore.Query.Direction.DESCENDING)
                .limit(1) // Only listen to the most recent notification
                .addSnapshotListener { snapshots, error ->
                    if (error != null) {
                        android.util.Log.e("NotificationListener", "Listen failed", error)
                        return@addSnapshotListener
                    }

                    if (snapshots != null && !snapshots.isEmpty) {
                        for (doc in snapshots.documentChanges) {
                            if (doc.type == com.google.firebase.firestore.DocumentChange.Type.ADDED) {
                                val notif = doc.document.toObject(NotificationItem::class.java)

                                // Check if this is a new notification
                                if (!NotificationTracker.hasBeenShown(notif.notifId)) {
                                    NotificationManager.show(
                                        header = notif.header,
                                        message = notif.message,
                                        duration = 5000L
                                    )
                                    NotificationTracker.markAsShown(context, notif.notifId)
                                }
                            }
                        }
                    }
                }
        } catch (e: Exception) {
            android.util.Log.e("NotificationListener", "Error setting up listener", e)
        }
    }
}