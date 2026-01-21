package com.example.clockin

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await

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

object FirebaseEmployeeManager {
    private val auth get() = FirebaseAuth.getInstance()
    private val db get() = FirebaseFirestore.getInstance()

    fun isLoggedIn(): Boolean = auth.currentUser != null

    fun getCurrentUserEmail(): String? = auth.currentUser?.email

    fun signOut() {
        auth.signOut()
    }

    suspend fun signIn(email: String, pass: String): Result<Boolean> {
        return try {
            auth.signInWithEmailAndPassword(email, pass).await()
            Result.success(true)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCurrentUser(): UserProfile? {
        val email = auth.currentUser?.email ?: return null
        try {
            val adminQuery = db.collection("user_admin_data")
                .whereEqualTo("email", email).get().await()
            if (!adminQuery.isEmpty) {
                val doc = adminQuery.documents[0]
                return UserProfile(
                    id = doc.id,
                    name = doc.getString("name") ?: "",
                    email = doc.getString("email") ?: "",
                    department = doc.getString("department") ?: "",
                    employment = doc.getString("employment") ?: "",
                    collectionName = "user_admin_data"
                )
            }
            val empQuery = db.collection("user_employee_data")
                .whereEqualTo("email", email).get().await()
            if (!empQuery.isEmpty) {
                val doc = empQuery.documents[0]
                return UserProfile(
                    id = doc.id,
                    name = doc.getString("name") ?: "",
                    email = doc.getString("email") ?: "",
                    employeeId = doc.getString("employeeId") ?: "",
                    department = doc.getString("department") ?: "",
                    employment = doc.getString("employment") ?: "",
                    collectionName = "user_employee_data"
                )
            }
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error fetching user", e)
        }
        return null
    }

    suspend fun updateUser(profile: UserProfile, field: String, value: String): Boolean {
        if (profile.collectionName.isEmpty() || profile.id.isEmpty()) return false
        return try {
            db.collection(profile.collectionName).document(profile.id)
                .update(field, value).await()
            true
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Update failed", e)
            false
        }
    }

    suspend fun verifyQrCode(code: String): Boolean {
        return try {
            val qrQuery = db.collection("qr")
                .whereEqualTo("qr_id", code)
                .whereEqualTo("status", true)
                .get()
                .await()

            if (qrQuery.isEmpty) return false

            val qrDoc = qrQuery.documents[0]
            val schedId = qrDoc.getString("schedId") ?: return false

            qrDoc.reference.update("scanCount", FieldValue.increment(1)).await()

            val currentUser = getCurrentUser() ?: return false
            if (currentUser.collectionName != "user_employee_data") return false

            val scheduleQuery = db.collection("user_employee_data")
                .document(currentUser.id)
                .collection("user_schedule")
                .whereEqualTo("schedId", schedId)
                .get()
                .await()

            if (scheduleQuery.isEmpty) return false

            val roomNumber = scheduleQuery.documents[0].getString("room") ?: ""

            val attendanceQuery = db.collection("user_employee_data")
                .document(currentUser.id)
                .collection("user_attendance")
                .whereEqualTo("room", roomNumber)
                .whereEqualTo("status", "Unattended")
                .get()
                .await()

            if (attendanceQuery.isEmpty) return false

            val attendanceDoc = attendanceQuery.documents[0]

            attendanceDoc.reference.update(
                mapOf(
                    "status" to "Present",
                    "timestamp" to FieldValue.serverTimestamp()
                )
            ).await()

            true
        } catch (e: Exception) {
            Log.e("FirebaseManager", "QR Workflow Failed", e)
            false
        }
    }

    suspend fun getAttendanceHistory(userId: String): List<AttendanceRecord> {
        return try {
            val snapshot = db.collection("user_employee_data")
                .document(userId)
                .collection("user_attendance")
                .orderBy("timestamp", Query.Direction.DESCENDING)
                .get()
                .await()

            snapshot.toObjects(AttendanceRecord::class.java)
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error getting attendance", e)
            emptyList()
        }
    }

    suspend fun getUserSchedule(userId: String): List<ScheduleRecord> {
        return try {
            val snapshot = db.collection("user_employee_data")
                .document(userId)
                .collection("user_schedule")
                .get()
                .await()

            snapshot.toObjects(ScheduleRecord::class.java)
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error getting schedule", e)
            emptyList()
        }
    }
}