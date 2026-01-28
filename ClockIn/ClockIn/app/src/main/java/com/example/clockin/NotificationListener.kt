package com.example.clockin

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalContext
import com.google.firebase.firestore.DocumentChange
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query

@Composable
fun RealtimeNotificationListener() {
    val context = LocalContext.current
    val currentUserEmail = FirebaseEmployeeManager.getCurrentUserEmail()

    LaunchedEffect(currentUserEmail) {
        if (!FirebaseEmployeeManager.isLoggedIn() || currentUserEmail == null) return@LaunchedEffect

        try {
            val db = FirebaseFirestore.getInstance()

            db.collection("notifications")
                .orderBy("dateCreated", Query.Direction.DESCENDING)
                .limit(1)
                .addSnapshotListener { snapshots, error ->
                    if (error != null) {
                        android.util.Log.e("NotificationListener", "Listen failed", error)
                        return@addSnapshotListener
                    }

                    if (snapshots != null && !snapshots.isEmpty) {
                        for (doc in snapshots.documentChanges) {
                            if (doc.type == DocumentChange.Type.ADDED) {
                                val notif = doc.document.toObject(NotificationItem::class.java)

                                val targets = notif.endNotif.split(",").map { it.trim() }

                                val isRelevant = targets.any { target ->
                                    target.equals("everyone", ignoreCase = true) ||
                                            target.equals(currentUserEmail, ignoreCase = true)
                                }

                                if (isRelevant && !NotificationTracker.hasBeenShown(notif.notifId)) {

                                    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                        val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                                        vibratorManager.defaultVibrator
                                    } else {
                                        @Suppress("DEPRECATION")
                                        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                                    }

                                    if (vibrator.hasVibrator()) {
                                        vibrator.vibrate(
                                            VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE)
                                        )
                                    }

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