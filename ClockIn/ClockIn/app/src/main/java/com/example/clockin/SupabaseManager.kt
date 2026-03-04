package com.example.clockin

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.provider.Settings
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
import io.github.jan.supabase.postgrest.query.filter.FilterOperator
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Calendar
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

data class ClassSession(
    val subject: String,
    val sectionDisplay: String,
    val targetBeaconName: String,
    val startTime: Date,
    val schedId: String,
    val isUpcoming: Boolean = false
)

@Serializable
data class QrRecord(
    val sectId: String? = null,
    val scanCount: Int = 0
)

object SupabaseManager {
    private const val TAG = "SupabaseManager"
    private const val SUPABASE_URL = "https://ckgvtzsslrxklmbkztxe.supabase.co"
    private const val SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo"

    private var cachedUser: UserProfile? = null
    private val processedAbsentCache = mutableSetOf<String>()

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
        processedAbsentCache.clear()
        try {
            client.auth.signOut()
        } catch (e: Exception) {
            e.printStackTrace()
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
                    .select(columns = Columns.list("*, sections(*)")) {
                        filter { eq("employeeId", user.id) }
                    }
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

    suspend fun getEmployeeSchedule(): List<Schedule> {
        val user = getCurrentUser() ?: return emptyList()
        return withContext(Dispatchers.IO) {
            try {
                client.from("schedule")
                    .select(columns = Columns.list("*, sections(*)")) {
                        filter { eq("employeeId", user.id) }
                    }
                    .decodeList<Schedule>()
            } catch (e: Exception) {
                Log.e(TAG, "getEmployeeSchedule Error: ${e.message}")
                emptyList()
            }
        }
    }

    suspend fun getCurrentClassBeacon(): ClassSession? {
        val user = getCurrentUser() ?: return null

        return withContext(Dispatchers.IO) {
            try {
                val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.US)
                val dayFormat = SimpleDateFormat("EEEE", Locale.US)
                val now = Date()
                val currentTimeStr = timeFormat.format(now)
                val currentDay = dayFormat.format(now)
                val currentTime = timeFormat.parse(currentTimeStr)

                val schedules = client.from("schedule")
                    .select(columns = Columns.list("*, sections(*)")) {
                        filter { eq("employeeId", user.id) }
                    }
                    .decodeList<Schedule>()

                val todaySchedules = schedules.filter {
                    it.weekday.trim().equals(currentDay, ignoreCase = true)
                }.sortedBy { it.startTime }

                val activeAttId = getActiveAttendanceId()
                if (activeAttId != null) {
                    val activeRecord = client.from("attendance")
                        .select(columns = Columns.list("*, schedule(*, sections(*))")) {
                            filter { eq("attendId", activeAttId) }
                        }.decodeSingleOrNull<Attendance>()

                    if (activeRecord?.schedule != null) {
                        return@withContext createClassSessionFromSchedule(activeRecord.schedule, false)
                    }
                }

                val ongoing = todaySchedules.firstOrNull { sched ->
                    try {
                        val start = timeFormat.parse(sched.startTime)
                        val end = timeFormat.parse(sched.endTime)
                        if (start != null && end != null && currentTime != null) {
                            return@firstOrNull currentTime.after(start) && currentTime.before(end)
                        }
                        false
                    } catch (e: Exception) { false }
                }

                if (ongoing != null) {
                    return@withContext createClassSessionFromSchedule(ongoing, false)
                }

                val upcoming = todaySchedules.firstOrNull { sched ->
                    try {
                        val start = timeFormat.parse(sched.startTime)
                        if (start != null && currentTime != null) {
                            val diff = start.time - currentTime.time
                            // Show as upcoming if it starts within the next 60 minutes
                            return@firstOrNull currentTime.before(start) && diff <= 60 * 60 * 1000
                        }
                        false
                    } catch (e: Exception) { false }
                }

                if (upcoming != null) {
                    return@withContext createClassSessionFromSchedule(upcoming, true)
                }

                val recentlyEnded = todaySchedules.lastOrNull { sched ->
                    try {
                        val end = timeFormat.parse(sched.endTime)
                        if (end != null && currentTime != null) {
                            return@lastOrNull currentTime.after(end)
                        }
                        false
                    } catch (e: Exception) { false }
                }

                if (recentlyEnded != null) {
                    return@withContext createClassSessionFromSchedule(recentlyEnded, false)
                }

                null
            } catch (e: Exception) {
                Log.e("SupabaseManager", "Error in getCurrentClassBeacon", e)
                null
            }
        }
    }

    private fun createClassSessionFromSchedule(schedule: Schedule, isUpcoming: Boolean): ClassSession {
        val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.US)
        val displaySectionName = schedule.sectionDetails?.sectionName ?: schedule.sectionName.ifEmpty { "Unknown" }
        val yearLevel = schedule.sectionDetails?.yearLevel ?: "?"
        val sectionDisplay = "$yearLevel - $displaySectionName"
        val targetBeaconName = displaySectionName.trim()

        val startOnlyTime = try { timeFormat.parse(schedule.startTime) } catch (e: Exception) { null }
        val calendar = Calendar.getInstance()
        calendar.time = Date()

        if (startOnlyTime != null) {
            val timeCal = Calendar.getInstance()
            timeCal.time = startOnlyTime
            calendar.set(Calendar.HOUR_OF_DAY, timeCal.get(Calendar.HOUR_OF_DAY))
            calendar.set(Calendar.MINUTE, timeCal.get(Calendar.MINUTE))
            calendar.set(Calendar.SECOND, timeCal.get(Calendar.SECOND))
            calendar.set(Calendar.MILLISECOND, 0)
        }
        val preciseStartTime = calendar.time

        return ClassSession(schedule.subject, sectionDisplay, targetBeaconName, preciseStartTime, schedule.id, isUpcoming)
    }

    suspend fun getTodayAttendance(schedId: String): Attendance? {
        val user = getCurrentUser() ?: return null
        return withContext(Dispatchers.IO) {
            try {
                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val today = dateFormat.format(Date())
                val startOfDay = "${today}T00:00:00"
                val endOfDay = "${today}T23:59:59"

                val list = client.from("attendance")
                    .select {
                        filter {
                            eq("schedId", schedId)
                            eq("employeeId", user.id)
                            gte("timeIn", startOfDay)
                            lte("timeIn", endOfDay)
                        }
                        order("timeIn", Order.DESCENDING)
                    }
                    .decodeList<Attendance>()

                list.firstOrNull()
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching today attendance", e)
                null
            }
        }
    }

    suspend fun verifyQrCode(qrId: String, context: Context, isBeaconFound: Boolean): Result<String> {
        val user = getCurrentUser() ?: return Result.failure(Exception("User not logged in"))

        return withContext(Dispatchers.IO) {
            try {
                if (!WifiChecker.isWifiEnabled(context) || !WifiChecker.isConnectedToAllowedWifi(context)) {
                    val requiredWifi = WifiChecker.getAllowedWifiSsid()
                    return@withContext Result.failure(Exception("Wrong WiFi! You must be connected to: $requiredWifi"))
                }

                if (!isBeaconFound) {
                    return@withContext Result.failure(Exception("Beacon not detected! Please move closer to the room's beacon."))
                }

                val activeClass = getCurrentClassBeacon()
                    ?: return@withContext Result.failure(Exception("You have no active or upcoming class scheduled right now."))
                
                if (activeClass.isUpcoming) {
                    val now = Date()
                    val diff = activeClass.startTime.time - now.time
                    if (diff > 10 * 60 * 1000) {
                        return@withContext Result.failure(Exception("Too early! You can only clock in up to 10 minutes before class starts."))
                    }
                }

                val actualScheduleId = activeClass.schedId

                val myCurrentSchedule = client.from("schedule")
                    .select { filter { eq("schedId", actualScheduleId) } }
                    .decodeSingleOrNull<Schedule>()
                    ?: return@withContext Result.failure(Exception("Error retrieving your schedule details."))
                val myTargetSectId = myCurrentSchedule.sectId

                val qrData = client.from("qr")
                    .select(columns = Columns.list("sectId", "scanCount")) {
                        filter {
                            eq("qrId", qrId)
                            eq("status", true)
                        }
                    }
                    .decodeSingleOrNull<QrRecord>()
                    ?: return@withContext Result.failure(Exception("Invalid or inactive QR Code"))

                val currentScanCount = qrData.scanCount
                client.from("qr").update({
                    set("scanCount", currentScanCount + 1)
                }) {
                    filter { eq("qrId", qrId) }
                }

                val qrSectId = qrData.sectId ?: return@withContext Result.failure(Exception("QR has no section linked"))

                if (myTargetSectId != qrSectId) {
                    return@withContext Result.failure(Exception("Wrong Room! This QR code does not belong to your current class section."))
                }

                val myAttendanceRecords = client.from("attendance")
                    .select {
                        filter {
                            eq("schedId", actualScheduleId)
                            eq("employeeId", user.id)
                        }
                    }
                    .decodeList<Attendance>()

                val activeSession = myAttendanceRecords.firstOrNull { it.timeOut == null }

                val timeFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val now = Date()
                val nowStr = timeFormat.format(now)

                if (activeSession != null) {
                    // Check if clocking out too early (more than 30 mins before endTime)
                    val timeFormatShort = SimpleDateFormat("HH:mm:ss", Locale.US)
                    val endTime = try { timeFormatShort.parse(myCurrentSchedule.endTime) } catch (e: Exception) { null }
                    val currentTimeOnly = try { timeFormatShort.parse(timeFormatShort.format(now)) } catch (e: Exception) { null }
                    
                    var newStatus: String? = null
                    if (endTime != null && currentTimeOnly != null) {
                        val remainingMillis = endTime.time - currentTimeOnly.time
                        if (remainingMillis > 30 * 60 * 1000) {
                            newStatus = "Incomplete"
                        }
                    }

                    client.from("attendance").update({
                        set("timeOut", nowStr)
                        if (newStatus != null) {
                            set("status", newStatus)
                        }
                    }) {
                        filter { eq("attendId", activeSession.id) }
                    }
                    
                    val msg = if (newStatus == "Incomplete") "Successfully Clocked Out: Incomplete" else "Successfully Clocked Out"
                    return@withContext Result.success(msg)
                }

                val todayDatePrefix = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(now)
                val completedToday = myAttendanceRecords.any {
                    it.timeIn?.startsWith(todayDatePrefix) == true && it.timeOut != null
                }

                if (completedToday) {
                    return@withContext Result.success("Already Completed for Today")
                }

                val status = calculateStatus(myCurrentSchedule.startTime, now)

                val newAttendance = Attendance(
                    id = UUID.randomUUID().toString(),
                    status = status,
                    timeIn = nowStr,
                    schedId = actualScheduleId,
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
                // Grace period: 15 minutes
                if (diff > 15 * 60 * 1000) "Late" else "Present"
            } else {
                "Present"
            }
        } catch (e: Exception) {
            "Present"
        }
    }

    suspend fun submitFeedback(title: String, message: String, isAnonymous: Boolean): Result<Boolean> {
        val user = getCurrentUser() ?: return Result.failure(Exception("User not logged in"))

        return withContext(Dispatchers.IO) {
            try {
                val feedbackId = UUID.randomUUID().toString()
                val dateCreated = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date())

                val feedbackJson = buildJsonObject {
                    put("feedbackId", feedbackId)
                    put("title", title)
                    put("message", message)
                    put("dateCreated", dateCreated)

                    if (!isAnonymous) {
                        put("employeeId", user.id)
                    }
                }

                client.from("feedback").insert(feedbackJson)
                Result.success(true)
            } catch (e: Exception) {
                Log.e(TAG, "Submit feedback error", e)
                Result.failure(e)
            }
        }
    }

    suspend fun getActiveAttendanceId(schedId: String? = null): String? {
        val user = getCurrentUser() ?: return null
        return withContext(Dispatchers.IO) {
            try {
                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val today = dateFormat.format(Date())
                val startOfDay = "${today}T00:00:00"
                val endOfDay = "${today}T23:59:59"

                val result = client.from("attendance")
                    .select(columns = Columns.list("attendId", "schedId")) {
                        filter {
                            eq("employeeId", user.id)
                            filter("timeOut", FilterOperator.IS, "null")
                            gte("timeIn", startOfDay)
                            lte("timeIn", endOfDay)
                        }
                    }
                    .decodeList<Map<String, String?>>()

                if (result.isNotEmpty()) {
                    val activeSession = result.first()
                    return@withContext activeSession["attendId"]
                } else {
                    return@withContext null
                }
            } catch (e: Exception) {
                Log.e("SupabaseManager", "Error checking active attendance: ${e.message}")
                null
            }
        }
    }

    suspend fun checkAndMarkAbsent(schedule: Schedule, employeeId: String, datePrefix: String): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                val cacheKey = "${schedule.id}-$datePrefix"
                if (processedAbsentCache.contains(cacheKey)) {
                    return@withContext Result.success(false)
                }

                val startOfDay = "${datePrefix}T00:00:00"
                val endOfDay = "${datePrefix}T23:59:59"

                // Fetch ANY record for this schedule today
                val existingRecords = client.from("attendance")
                    .select {
                        filter {
                            eq("schedId", schedule.id)
                            eq("employeeId", employeeId)
                            gte("timeIn", startOfDay)
                            lte("timeIn", endOfDay)
                        }
                    }
                    .decodeList<Attendance>()

                if (existingRecords.isNotEmpty()) {
                    processedAbsentCache.add(cacheKey)
                    return@withContext Result.success(false)
                }

                val absentId = UUID.randomUUID().toString()
                
                // Set the record times to the schedule's intended start/end for cleaner history
                val startStr = "${datePrefix}T${schedule.startTime}"
                val endStr = "${datePrefix}T${schedule.endTime}"

                val absentRecord = Attendance(
                    id = absentId,
                    status = "Absent",
                    timeIn = startStr,
                    timeOut = endStr,
                    schedId = schedule.id,
                    employeeId = employeeId
                )

                client.from("attendance").insert(absentRecord)
                processedAbsentCache.add(cacheKey)

                Result.success(true)
            } catch (e: Exception) {
                Log.e(TAG, "Error marking absent", e)
                Result.failure(e)
            }
        }
    }

    suspend fun markIncompleteIfStillActive(schedId: String, employeeId: String) {
        withContext(Dispatchers.IO) {
            try {
                val timeFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val nowStr = timeFormat.format(Date())

                val activeSession = client.from("attendance")
                    .select {
                        filter {
                            eq("schedId", schedId)
                            eq("employeeId", employeeId)
                            filter("timeOut", FilterOperator.IS, "null")
                        }
                    }
                    .decodeSingleOrNull<Attendance>()

                if (activeSession != null) {
                    client.from("attendance").update({
                        set("status", "Incomplete")
                        set("timeOut", nowStr)
                    }) {
                        filter { eq("attendId", activeSession.id) }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in markIncompleteIfStillActive", e)
            }
        }
    }

    suspend fun markIncomplete(schedId: String, employeeId: String): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                val timeFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val nowStr = timeFormat.format(Date())

                val activeSession = client.from("attendance")
                    .select {
                        filter {
                            eq("schedId", schedId)
                            eq("employeeId", employeeId)
                            filter("timeOut", FilterOperator.IS, "null")
                        }
                    }
                    .decodeSingleOrNull<Attendance>()

                if (activeSession != null) {
                    client.from("attendance").update({
                        set("status", "Incomplete")
                        set("timeOut", nowStr)
                    }) {
                        filter { eq("attendId", activeSession.id) }
                    }
                    Result.success(true)
                } else {
                    Result.failure(Exception("No active session to mark incomplete"))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error marking incomplete", e)
                Result.failure(e)
            }
        }
    }

    @SuppressLint("HardwareIds")
    private fun getDeviceId(context: Context): String {
        val prefs = context.getSharedPreferences("device_prefs", Context.MODE_PRIVATE)
        val savedId = prefs.getString("device_id", null)
        if (savedId != null) return savedId

        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        val fingerprint = "$androidId${Build.MANUFACTURER}${Build.MODEL}${Build.BRAND}${Build.DEVICE}"
        val deviceId = MessageDigest.getInstance("SHA-256")
            .digest(fingerprint.toByteArray())
            .joinToString("") { "%02x".format(it) }

        prefs.edit().putString("device_id", deviceId).apply()
        return deviceId
    }

    private fun getDeviceInfo(): String = "${Build.MANUFACTURER} ${Build.MODEL}"

    suspend fun signInWithDeviceCheck(context: Context, email: String, pass: String): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                cachedUser = null
                client.from("user_devices")
                client.auth.signInWith(Email) {
                    this.email = email
                    this.password = pass
                }

                val user = getCurrentUser() ?: return@withContext Result.failure(Exception("User not found"))
                val deviceId = getDeviceId(context)
                val deviceInfo = getDeviceInfo()

                val existingDevice = client.from("user_devices")
                    .select { filter { eq("employeeId", user.id) } }
                    .decodeSingleOrNull<Map<String, String>>()

                if (existingDevice != null) {
                    val registeredId = existingDevice["deviceId"]
                    if (registeredId == deviceId) {
                        client.from("user_devices").update({
                            set("lastLogin", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date()))
                        }) { filter { eq("employeeId", user.id) } }
                        Result.success("Login successful")
                    } else {
                        signOut()
                        Result.failure(Exception("This account is already registered on another device: ${existingDevice["deviceInfo"]}"))
                    }
                } else {
                    val deviceData = mapOf(
                        "deviceId" to deviceId,
                        "employeeId" to user.id,
                        "deviceInfo" to deviceInfo,
                        "registeredAt" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date()),
                        "lastLogin" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date())
                    )
                    client.from("user_devices").insert(deviceData)
                    Result.success("Login successful")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Sign in with device check error", e)
                Result.failure(e)
            }
        }
    }
}