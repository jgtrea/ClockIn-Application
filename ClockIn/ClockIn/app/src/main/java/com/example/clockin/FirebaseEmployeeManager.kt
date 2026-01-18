package com.example.clockin

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
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

object FirebaseEmployeeManager {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

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
            val querySnapshot = db.collection("qr")
                .whereEqualTo("qr_id", code)
                .whereEqualTo("status", true)
                .get()
                .await()

            !querySnapshot.isEmpty
        } catch (e: Exception) {
            Log.e("FirebaseManager", "QR Verification Failed", e)
            false
        }
    }
}