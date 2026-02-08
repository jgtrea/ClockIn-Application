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
import io.github.jan.supabase.postgrest.query.Order
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
    val name: String = "",
    val email: String = "",
    val department: String? = null,
    val employment: String? = null
)

@Serializable
data class SectionInfo(
    @SerialName("sectionName") val sectionName: String = "",
    @SerialName("yearLevel") val yearLevel: String = ""
)

@Serializable
data class Schedule(
    @SerialName("schedId") val id: String = "",
    @SerialName("sectId") val sectId: String = "",
    @SerialName("sectionName") val sectionName: String = "",
    val subject: String = "",
    @SerialName("startTime") val startTime: String = "",
    @SerialName("endTime") val endTime: String = "",
    @SerialName("weekday") val weekday: String = "",
    @SerialName("employeeId") val employeeId: String = "",
    @SerialName("sections") val sectionDetails: SectionInfo? = null
)

@Serializable
data class Attendance(
    @SerialName("attendId") val id: String = "",
    val status: String = "",
    @SerialName("timeIn") val timeIn: String? = null,
    @SerialName("timeOut") val timeOut: String? = null,
    @SerialName("schedId") val schedId: String = "",
    @SerialName("employeeId") val employeeId: String? = null,
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
    private const val TAG = "SupabaseManager"
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
                Log.e(TAG, "Update password error", e)
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
                cachedUser = cachedUser?.copy(name = newName)
                Result.success(true)
            } catch (e: Exception) {
                Log.e(TAG, "Update name error", e)
                Result.failure(e)
            }
        }
    }

    suspend fun getCurrentUser(): UserProfile? {
        if (cachedUser != null) return cachedUser

        val session = client.auth.currentSessionOrNull()
        if (session == null) return null
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

                if (mySchedules.isEmpty()) return@withContext emptyList()

                val myScheduleIds = mySchedules.map { it.id }
                val scheduleMap = mySchedules.associateBy { it.id }

                val attendanceRecords = client.from("attendance")
                    .select {
                        filter { isIn("schedId", myScheduleIds) }
                        order("timeIn", Order.DESCENDING)
                    }
                    .decodeList<Attendance>()

                val populatedAttendance = attendanceRecords.map { record ->
                    record.copy(schedule = scheduleMap[record.schedId])
                }

                populatedAttendance
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching attendance", e)
                emptyList()
            }
        }
    }

    suspend fun getAllSections(): List<Map<String, String>> {
        return withContext(Dispatchers.IO) {
            try {
                client.from("sections").select().decodeList<Map<String, String>>()
            } catch (e: Exception) {
                Log.e("SupabaseManager", "Error fetching sections: ${e.message}")
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
                    .select(columns = Columns.list("schedId")) {
                        filter {
                            eq("qrId", qrId)
                            eq("status", true)
                        }
                    }
                    .decodeSingleOrNull<Map<String, String>>()
                    ?: return@withContext Result.failure(Exception("Invalid or inactive QR Code"))

                val scheduleId = qrData["schedId"] ?: return@withContext Result.failure(Exception("QR has no schedule linked"))

                val schedule = client.from("schedule")
                    .select { filter { eq("schedId", scheduleId) } }
                    .decodeSingleOrNull<Schedule>()
                    ?: return@withContext Result.failure(Exception("Schedule not found"))

                if (schedule.employeeId != user.id) {
                    return@withContext Result.failure(Exception("Not your QR Code. This belongs to another employee."))
                }

                val myAttendanceRecords = client.from("attendance")
                    .select {
                        filter {
                            eq("schedId", scheduleId)
                            eq("employeeId", user.id)
                        }
                    }
                    .decodeList<Attendance>()

                val activeSession = myAttendanceRecords.firstOrNull { it.timeOut == null }

                val timeFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val now = Date()
                val nowStr = timeFormat.format(now)

                if (activeSession != null) {
                    client.from("attendance").update({
                        set("timeOut", nowStr)
                    }) {
                        filter { eq("attendId", activeSession.id) }
                    }
                    return@withContext Result.success("Successfully Clocked Out")
                }

                val todayDatePrefix = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(now)
                val completedToday = myAttendanceRecords.any {
                    it.timeIn?.startsWith(todayDatePrefix) == true && it.timeOut != null
                }

                if (completedToday) {
                    return@withContext Result.success("Already Completed for Today")
                }

                val status = calculateStatus(schedule.startTime, now)

                val newAttendance = Attendance(
                    id = UUID.randomUUID().toString(),
                    status = status,
                    timeIn = nowStr,
                    schedId = scheduleId,
                    employeeId = user.id
                )

                client.from("attendance").insert(newAttendance)

                return@withContext Result.success("Successfully Clocked In: $status")

            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    private fun calculateStatus(scheduleStartTime: String, currentTime: Date): String {
        return try {
            val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
            val currentTimeStr = timeFormat.format(currentTime)

            val start = timeFormat.parse(scheduleStartTime)
            val current = timeFormat.parse(currentTimeStr)

            if (start != null && current != null) {
                val diff = current.time - start.time
                if (diff > 15 * 60 * 1000) "Late" else "Present"
            } else {
                "Present"
            }
        } catch (e: Exception) {
            "Present"
        }
    }

    suspend fun verifyBleBeacon(scannedName: String): Result<String> {
        val user = getCurrentUser() ?: return Result.failure(Exception("User not logged in"))

        return withContext(Dispatchers.IO) {
            try {
                val beaconData = client.from("ble_devices")
                    .select {
                        filter {
                            eq("name", scannedName)
                            eq("status", true)
                        }
                    }
                    .decodeSingleOrNull<Map<String, String>>()
                    ?: return@withContext Result.failure(Exception("Unknown or inactive BLE device"))

                val beaconSectId = beaconData["sectId"]
                    ?: return@withContext Result.failure(Exception("Beacon is not assigned to a section"))

                val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.US)
                val dayFormat = SimpleDateFormat("EEEE", Locale.US)
                val now = Date()
                val currentTimeStr = timeFormat.format(now)
                val currentDay = dayFormat.format(now)

                val schedules = client.from("schedule")
                    .select { filter { eq("employeeId", user.id) } }
                    .decodeList<Schedule>()

                val currentSchedule = schedules.firstOrNull { sched ->
                    try {
                        if (!sched.weekday.equals(currentDay, ignoreCase = true)) return@firstOrNull false

                        val start = timeFormat.parse(sched.startTime)
                        val end = timeFormat.parse(sched.endTime)
                        val current = timeFormat.parse(currentTimeStr)

                        if (start != null && end != null && current != null) {
                            return@firstOrNull current.after(start) && current.before(end)
                        }
                        false
                    } catch (e: Exception) {
                        false
                    }
                } ?: return@withContext Result.failure(Exception("You have no class scheduled right now."))

                if (beaconSectId != currentSchedule.sectId) {
                    return@withContext Result.failure(Exception("Wrong Room! You are in the room for a different section."))
                }

                return@withContext Result.success("Location Verified: Correct Section Room")

            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun submitFeedback(title: String, message: String): Result<Boolean> {
        val user = getCurrentUser() ?: return Result.failure(Exception("User not logged in"))

        return withContext(Dispatchers.IO) {
            try {
                val feedbackId = UUID.randomUUID().toString()
                val dateCreated = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date())

                val feedback = mapOf(
                    "feedbackId" to feedbackId,
                    "title" to title,
                    "message" to message,
                    "employeeId" to user.id,
                    "dateCreated" to dateCreated
                )

                client.from("feedback").insert(feedback)
                Result.success(true)
            } catch (e: Exception) {
                Log.e(TAG, "Submit feedback error", e)
                Result.failure(e)
            }
        }
    }
}