package com.example.clockin.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.util.Date

@Serializable
data class UserProfile(
    @SerialName("employeeId") val id: String,
    val name: String = "",
    val email: String = "",
    val department: String? = null,
    val employment: String? = null,
)

@Serializable
data class SectionInfo(
    @SerialName("sectionName") val sectionName: String = "",
    @SerialName("yearLevel") val yearLevel: String = "",
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
    @SerialName("sections") val sectionDetails: SectionInfo? = null,
)

@Serializable
data class Attendance(
    @SerialName("attendId") val id: String = "",
    val status: String = "",
    @SerialName("timeIn") val timeIn: String? = null,
    @SerialName("timeOut") val timeOut: String? = null,
    @SerialName("schedId") val schedId: String = "",
    @SerialName("employeeId") val employeeId: String? = null,
    val schedule: Schedule? = null,
)

@Serializable
data class NotificationItem(
    @SerialName("notifId") val notifId: String = "",
    val header: String = "",
    val message: String = "",
    @SerialName("dataCreated") val dateCreated: String? = null,
    @SerialName("endNotif") val target: String? = "everyone",
)

data class ClassSession(
    val subject: String,
    val sectionDisplay: String,
    val targetBeaconName: String,
    val startTime: Date,
    val schedId: String,
    val isUpcoming: Boolean = false,
)

@Serializable
data class QrRecord(
    val sectId: String? = null,
    val scanCount: Int = 0,
)

@Serializable
data class Notification(
    @SerialName("notifId") val id: String,
    val header: String,
    val message: String,
    @SerialName("endNotif") val target: String = "everyone",
    @SerialName("dataCreated") val dataCreated: String? = null,
)
