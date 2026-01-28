package com.example.clockin

import android.content.Context
import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class UserProfile(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val employeeId: String = "",
    val department: String = "",
    val employment: String = "",
    val collectionName: String = ""
)

data class AttendanceRecord(
    val date: String = "",
    val room: String = "",
    val status: String = "",
    val time_in: String = "",
    val time_out: String = "",
    val timestamp: Timestamp? = null
)

data class ScheduleRecord(
    val schedId: String = "",
    val room: String = "",
    val weekday: String = "",
    val start_time: String = "",
    val end_time: String = ""
)

data class NotificationItem(
    val header: String = "",
    val message: String = "",
    val endNotif: String = "everyone",
    val dateCreated: Timestamp? = null,
    val notifId: Int = 0
)

object FirebaseEmployeeManager {
    private val auth get() = FirebaseAuth.getInstance()
    private val db get() = FirebaseFirestore.getInstance()

    private var currentUserCache: UserProfile? = null

    fun isLoggedIn(): Boolean = auth.currentUser != null

    fun getCurrentUserEmail(): String? = auth.currentUser?.email

    fun signOut() {
        auth.signOut()
        currentUserCache = null
    }

    suspend fun signIn(email: String, pass: String): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                auth.signInWithEmailAndPassword(email, pass).await()
                getCurrentUser()
                Result.success(true)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getCurrentUser(forceRefresh: Boolean = false): UserProfile? {
        if (!forceRefresh && currentUserCache != null) return currentUserCache

        val email = auth.currentUser?.email ?: return null

        return withContext(Dispatchers.IO) {
            try {
                val empQuery = db.collection("user_employee_data")
                    .whereEqualTo("email", email).get().await()

                if (!empQuery.isEmpty) {
                    val doc = empQuery.documents[0]
                    val profile = UserProfile(
                        id = doc.id,
                        name = doc.getString("name") ?: "",
                        email = doc.getString("email") ?: "",
                        employeeId = doc.getString("employeeId") ?: "",
                        department = doc.getString("department") ?: "",
                        employment = doc.getString("employment") ?: "",
                        collectionName = "user_employee_data"
                    )
                    currentUserCache = profile
                    return@withContext profile
                }

                val adminQuery = db.collection("user_admin_data")
                    .whereEqualTo("email", email).get().await()

                if (!adminQuery.isEmpty) {
                    val doc = adminQuery.documents[0]
                    val profile = UserProfile(
                        id = doc.id,
                        name = doc.getString("name") ?: "",
                        email = doc.getString("email") ?: "",
                        department = doc.getString("department") ?: "",
                        employment = doc.getString("employment") ?: "",
                        collectionName = "user_admin_data"
                    )
                    currentUserCache = profile
                    return@withContext profile
                }
            } catch (e: Exception) {
                Log.e("FirebaseManager", "Error fetching user", e)
            }
            return@withContext null
        }
    }

    suspend fun updateUser(profile: UserProfile, field: String, value: String): Boolean {
        if (profile.collectionName.isEmpty() || profile.id.isEmpty()) return false
        return withContext(Dispatchers.IO) {
            try {
                db.collection(profile.collectionName).document(profile.id)
                    .update(field, value).await()
                true
            } catch (e: Exception) {
                Log.e("FirebaseManager", "Update failed", e)
                false
            }
        }
    }

    suspend fun verifyQrCode(code: String, context: Context): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                if (!WifiChecker.isWifiEnabled(context) || !WifiChecker.isConnectedToAllowedWifi(context)) {
                    return@withContext false
                }

                val qrQuery = db.collection("qr")
                    .whereEqualTo("qr_id", code)
                    .whereEqualTo("status", true)
                    .get()
                    .await()

                if (qrQuery.isEmpty) return@withContext false

                val qrDoc = qrQuery.documents[0]
                val schedId = qrDoc.getString("schedId") ?: return@withContext false

                qrDoc.reference.update("scanCount", FieldValue.increment(1))

                val currentUser = getCurrentUser() ?: return@withContext false
                if (currentUser.collectionName != "user_employee_data") return@withContext false

                val scheduleQuery = db.collection("user_employee_data")
                    .document(currentUser.id)
                    .collection("user_schedule")
                    .whereEqualTo("schedId", schedId)
                    .get()
                    .await()

                if (scheduleQuery.isEmpty) return@withContext false

                val scheduleDoc = scheduleQuery.documents[0]
                val roomNumber = scheduleDoc.getString("room") ?: ""
                val startTimeStr = scheduleDoc.getString("start_time") ?: "00:00"

                val activeSessionQuery = db.collection("user_employee_data")
                    .document(currentUser.id)
                    .collection("user_attendance")
                    .whereEqualTo("room", roomNumber)
                    .whereIn("status", listOf("Present", "Late"))
                    .get()
                    .await()

                if (!activeSessionQuery.isEmpty) {
                    val attendanceDoc = activeSessionQuery.documents[0]
                    val currentTime = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
                    attendanceDoc.reference.update(mapOf("status" to "Completed", "time_out" to currentTime)).await()
                    return@withContext true
                }

                val unattendedQuery = db.collection("user_employee_data")
                    .document(currentUser.id)
                    .collection("user_attendance")
                    .whereEqualTo("room", roomNumber)
                    .whereEqualTo("status", "Unattended")
                    .get()
                    .await()

                if (!unattendedQuery.isEmpty) {
                    val attendanceDoc = unattendedQuery.documents[0]
                    val format = SimpleDateFormat("HH:mm", Locale.getDefault())
                    val currentTimeStr = format.format(Date())

                    var newStatus = "Present"
                    try {
                        val dateStart = format.parse(startTimeStr)
                        val dateNow = format.parse(currentTimeStr)
                        if (dateStart != null && dateNow != null) {
                            val diffMinutes = (dateNow.time - dateStart.time) / (1000 * 60)
                            if (diffMinutes > 15) newStatus = "Late"
                        }
                    } catch (e: Exception) { Log.e("Manager", "Time error", e) }

                    attendanceDoc.reference.update(
                        mapOf(
                            "status" to newStatus,
                            "time_in" to currentTimeStr,
                            "timestamp" to FieldValue.serverTimestamp()
                        )
                    ).await()
                    return@withContext true
                }
                return@withContext false
            } catch (e: Exception) {
                Log.e("FirebaseManager", "QR Workflow Failed", e)
                false
            }
        }
    }

    suspend fun getAttendanceHistory(userId: String): List<AttendanceRecord> {
        return withContext(Dispatchers.IO) {
            try {
                val snapshot = db.collection("user_employee_data")
                    .document(userId)
                    .collection("user_attendance")
                    .orderBy("timestamp", Query.Direction.DESCENDING)
                    .limit(50)
                    .get()
                    .await()

                snapshot.toObjects(AttendanceRecord::class.java)
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    suspend fun getUserSchedule(userId: String): List<ScheduleRecord> {
        return withContext(Dispatchers.IO) {
            try {
                val snapshot = db.collection("user_employee_data")
                    .document(userId)
                    .collection("user_schedule")
                    .get()
                    .await()

                snapshot.toObjects(ScheduleRecord::class.java)
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    suspend fun getNotifications(): List<NotificationItem> {
        return withContext(Dispatchers.IO) {
            val userEmail = getCurrentUserEmail() ?: return@withContext emptyList()

            try {
                val snapshot = db.collection("notifications")
                    .orderBy("dateCreated", Query.Direction.DESCENDING)
                    .limit(20)
                    .get()
                    .await()

                val allNotifs = snapshot.toObjects(NotificationItem::class.java)

                allNotifs.filter { notif ->
                    val targets = notif.endNotif.split(",").map { it.trim() }

                    targets.any { target ->
                        target.equals("everyone", ignoreCase = true) ||
                                target.equals(userEmail, ignoreCase = true)
                    }
                }
            } catch (e: Exception) {
                emptyList()
            }
        }
    }
}