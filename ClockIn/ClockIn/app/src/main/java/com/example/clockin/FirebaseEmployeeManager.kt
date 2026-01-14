package com.example.clockin

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

// Simple Employee Data Model
data class Employee(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val employeeId: String = "",
    val department: String = "",
    val employment: String = ""
)

// Extension to convert Firestore document to Employee
fun com.google.firebase.firestore.DocumentSnapshot.toEmployee(): Employee? {
    return try {
        Employee(
            id = id,
            name = getString("name") ?: "",
            email = getString("email") ?: "",
            employeeId = getString("employeeId") ?: "",
            department = getString("department") ?: "",
            employment = getString("employment") ?: ""
        )
    } catch (e: Exception) {
        Log.e("Firestore", "Error converting employee", e)
        null
    }
}

object FirebaseEmployeeManager {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

    // Get current employee data
    suspend fun getCurrentEmployee(): Employee? {
        return try {
            val userId = auth.currentUser?.uid ?: return null

            val doc = db.collection("user_employee_data")
                .document(userId)
                .get()
                .await()

            doc.toEmployee()
        } catch (e: Exception) {
            Log.e("Firebase", "Get employee failed", e)
            null
        }
    }

    // Update employee data
    suspend fun updateEmployee(employee: Employee): Boolean {
        return try {
            db.collection("user_employee_data")
                .document(employee.id)
                .update(
                    mapOf(
                        "name" to employee.name,
                        "email" to employee.email,
                        "employeeId" to employee.employeeId,
                        "department" to employee.department,
                        "employment" to employee.employment
                    )
                )
                .await()

            true
        } catch (e: Exception) {
            Log.e("Firebase", "Update failed", e)
            false
        }
    }

    fun getCurrentUserId(): String? = auth.currentUser?.uid
    fun isLoggedIn(): Boolean = auth.currentUser != null
}