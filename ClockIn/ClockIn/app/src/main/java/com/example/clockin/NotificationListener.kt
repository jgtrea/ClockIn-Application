package com.example.clockin

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.delay

@Composable
fun NotificationListener(
    checkIntervalMs: Long = 30000L,
    enabled: Boolean = true
) {
    val context = LocalContext.current
    var lastCheckTime by remember { mutableStateOf(System.currentTimeMillis()) }

    LaunchedEffect(enabled) {
        if (!enabled) return@LaunchedEffect

        while (enabled) {
            try {
                if (FirebaseEmployeeManager.isLoggedIn()) {

                    val notifications = FirebaseEmployeeManager.getNotifications()

                    val newNotifications = NotificationTracker.filterNewNotifications(notifications)

                    newNotifications.forEach { notif ->
                        NotificationManager.show(
                            header = notif.header,
                            message = notif.message,
                            duration = 5000L
                        )

                        NotificationTracker.markAsShown(context, notif.notifId)
                    }

                    lastCheckTime = System.currentTimeMillis()
                }
            } catch (e: Exception) {
                android.util.Log.e("NotificationListener", "Error checking notifications", e)
            }

            delay(checkIntervalMs)
        }
    }
}

@Composable
fun RealtimeNotificationListener() {
    val context = LocalContext.current
    val currentUserEmail = FirebaseEmployeeManager.getCurrentUserEmail()

    LaunchedEffect(currentUserEmail) {
        if (!FirebaseEmployeeManager.isLoggedIn() || currentUserEmail == null) return@LaunchedEffect

        try {
            val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()

            db.collection("notifications")
                .orderBy("dateCreated", com.google.firebase.firestore.Query.Direction.DESCENDING)
                .limit(1)
                .addSnapshotListener { snapshots, error ->
                    if (error != null) {
                        android.util.Log.e("NotificationListener", "Listen failed", error)
                        return@addSnapshotListener
                    }

                    if (snapshots != null && !snapshots.isEmpty) {
                        for (doc in snapshots.documentChanges) {
                            if (doc.type == com.google.firebase.firestore.DocumentChange.Type.ADDED) {
                                val notif = doc.document.toObject(NotificationItem::class.java)

                                val targets = notif.endNotif.split(",").map { it.trim() }

                                val isRelevant = targets.any { target ->
                                    target.equals("everyone", ignoreCase = true) ||
                                            target.equals(currentUserEmail, ignoreCase = true)
                                }

                                if (isRelevant && !NotificationTracker.hasBeenShown(notif.notifId)) {
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