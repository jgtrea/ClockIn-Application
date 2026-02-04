package com.example.clockin

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalContext
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.delay
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Notification(
    @SerialName("notifid") val id: String,
    val header: String,
    val message: String,
    @SerialName("endnotif") val target: String = "everyone",
    @SerialName("datecreated") val dateCreated: String? = null
)

@Composable
fun RealtimeNotificationListener() {
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        while (true) {
            if (SupabaseManager.isLoggedIn()) {
                try {
                    val user = SupabaseManager.getCurrentUser()
                    val userEmail = user?.email ?: ""

                    val recentNotifications = SupabaseManager.client.from("notification")
                        .select {
                            order("datecreated", Order.DESCENDING)
                            limit(3)
                        }
                        .decodeList<Notification>()

                    for (notif in recentNotifications) {
                        val targets = notif.target.split(",").map { it.trim() }
                        val isRelevant = targets.any { target ->
                            target.equals("everyone", ignoreCase = true) ||
                                    target.equals(userEmail, ignoreCase = true)
                        }

                        if (isRelevant && !NotificationTracker.hasBeenShown(notif.id)) {
                            triggerVibration(context)

                            NotificationManager.show(
                                header = notif.header,
                                message = notif.message,
                                duration = 5000L
                            )
                            NotificationTracker.markAsShown(context, notif.id)
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            delay(10000)
        }
    }
}

private fun triggerVibration(context: Context) {
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
}