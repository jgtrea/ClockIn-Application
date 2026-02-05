package com.example.clockin

import android.content.Context
import android.util.Log
import io.github.jan.supabase.annotations.SupabaseInternal
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.OtpType
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.providers.builtin.OTP
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

@Serializable
data class UserProfile(
    @SerialName("employeeId") val id: String,
    val name: String,
    val email: String,
    val department: String? = null,
    val employment: String? = null
)

@Serializable
data class Schedule(
    @SerialName("schedId") val id: String,
    @SerialName("sectionName") val sectionName: String,
    val subject: String,
    @SerialName("startTime") val startTime: String,
    @SerialName("endTime") val endTime: String
)

@Serializable
data class Attendance(
    @SerialName("attendId") val id: String,
    val status: String,
    @SerialName("timeIn") val timeIn: String? = null,
    @SerialName("timeOut") val timeOut: String? = null,
    @SerialName("schedId") val schedId: String,
    val schedule: Schedule? = null
)

@Serializable
data class NotificationItem(
    @SerialName("notifId") val notifId: String = "",
    val header: String = "",
    val message: String = "",
    @SerialName("dataCreated") val dateCreated: String? = null,
    @SerialName("endNotif") val target: String? = "everyone"
)

object SupabaseManager {
    private const val SUPABASE_URL = "https://ckgvtzsslrxklmbkztxe.supabase.co"
    private const val SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo"

    private var cachedUser: UserProfile? = null

    @OptIn(SupabaseInternal::class)
    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_KEY
    ) {
        install(Auth)
        install(Postgrest)
        httpConfig {
            install(ContentNegotiation) {
                json(Json {
                    ignoreUnknownKeys = true
                    isLenient = true
                    encodeDefaults = true
                })
            }
        }
    }

    suspend fun loadSession(): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                client.auth.loadFromStorage()
            } catch (e: Exception) {
                false
            }
        }
    }

    fun isLoggedIn(): Boolean = client.auth.currentSessionOrNull() != null

    suspend fun signOut() {
        cachedUser = null
        try {
            client.auth.signOut()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun signIn(email: String, pass: String): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                cachedUser = null
                client.auth.signInWith(Email) {
                    this.email = email
                    this.password = pass
                }
                Result.success(true)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun sendOTP(email: String): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                client.auth.signInWith(OTP) {
                    this.email = email
                }
                Result.success(true)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun verifyOTP(email: String, token: String): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                client.auth.verifyEmailOtp(
                    type = OtpType.Email.EMAIL,
                    email = email,
                    token = token
                )
                Result.success(true)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun updateUserPassword(newPassword: String): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                client.auth.updateUser {
                    password = newPassword
                }
                Result.success(true)
            } catch (e: Exception) {
                Log.e("SupabaseManager", "Update password error", e)
                Result.failure(e)
            }
        }
    }

    suspend fun updateUserName(employeeId: String, newName: String): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                client.from("user_employee_data")
                    .update({
                        set("name", newName)
                    }) {
                        filter {
                            eq("employeeId", employeeId)
                        }
                    }

                // Update cached user
                cachedUser = cachedUser?.copy(name = newName)

                Result.success(true)
            } catch (e: Exception) {
                Log.e("SupabaseManager", "Update name error", e)
                Result.failure(e)
            }
        }
    }

    suspend fun getCurrentUser(): UserProfile? {
        if (cachedUser != null) return cachedUser

        val session = client.auth.currentSessionOrNull() ?: return null
        val userEmail = session.user?.email ?: ""

        return withContext(Dispatchers.IO) {
            try {
                val result = client.from("user_employee_data")
                    .select {
                        filter { eq("email", userEmail) }
                    }
                    .decodeSingleOrNull<UserProfile>()

                cachedUser = result
                result
            } catch (e: Exception) {
                null
            }
        }
    }

    suspend fun getAttendanceWithSchedule(): List<Attendance> {
        val user = getCurrentUser() ?: return emptyList()

        return withContext(Dispatchers.IO) {
            try {
                val mySchedules = client.from("schedule")
                    .select { filter { eq("employeeId", user.id) } }
                    .decodeList<Schedule>()

                val myScheduleIds = mySchedules.map { it.id }

                if (myScheduleIds.isEmpty()) return@withContext emptyList()

                val result = client.from("attendance").select(
                    columns = Columns.list("*", "schedule(*)")
                ) {
                    filter { isIn("schedId", myScheduleIds) }
                }

                result.decodeList<Attendance>()
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    suspend fun getEmployeeSchedule(): List<Schedule> {
        val user = getCurrentUser() ?: return emptyList()
        return withContext(Dispatchers.IO) {
            try {
                client.from("schedule")
                    .select { filter { eq("employeeId", user.id) } }
                    .decodeList<Schedule>()
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    suspend fun verifyQrCode(qrId: String, context: Context): Result<String> {
        val user = getCurrentUser() ?: return Result.failure(Exception("User not logged in"))

        return withContext(Dispatchers.IO) {
            try {
                if (!WifiChecker.isWifiEnabled(context) || !WifiChecker.isConnectedToAllowedWifi(context)) {
                    return@withContext Result.failure(Exception("Invalid WiFi Network"))
                }

                val qrData = client.from("qr")
                    .select {
                        filter {
                            eq("qrId", qrId)
                            eq("status", true)
                        }
                    }
                    .decodeSingleOrNull<Map<String, String>>()
                    ?: return@withContext Result.failure(Exception("Invalid or inactive QR Code"))

                val scheduleId = qrData["schedId"] ?: return@withContext Result.failure(Exception("QR has no schedule linked"))

                val existingAttendance = client.from("attendance")
                    .select { filter { eq("schedId", scheduleId) } }
                    .decodeList<Attendance>()
                    .firstOrNull { it.status == "Present" || it.status == "Late" }

                if (existingAttendance != null) {
                    return@withContext Result.success("Already Clocked In")
                }

                val schedule = client.from("schedule")
                    .select { filter { eq("schedId", scheduleId) } }
                    .decodeSingleOrNull<Schedule>()
                    ?: return@withContext Result.failure(Exception("Schedule not found"))

                val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                val now = Date()
                val currentTimeStr = timeFormat.format(now)

                var status = "Present"
                try {
                    val startTime = timeFormat.parse(schedule.startTime)
                    val currentTime = timeFormat.parse(currentTimeStr)
                    if (startTime != null && currentTime != null) {
                        val diff = currentTime.time - startTime.time
                        if (diff > 15 * 60 * 1000) status = "Late"
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                val newAttendance = Attendance(
                    id = UUID.randomUUID().toString(),
                    status = status,
                    timeIn = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(now),
                    schedId = scheduleId
                )

                client.from("attendance").insert(newAttendance)

                return@withContext Result.success("Successfully Clocked In: $status")

            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}