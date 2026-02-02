package com.example.clockin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class AttendanceItem(
    val title: String,
    val status: String,
    val timeIn: String,
    val timeOut: String,
    val date: String,
    val sortTime: String
)

@Composable
fun AttendanceScreen(navController: NavController) {
    var showPolicies by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showFAQ by remember { mutableStateOf(false) }

    var searchQuery by remember { mutableStateOf("") }

    var attendanceMap by remember { mutableStateOf<Map<String, List<AttendanceItem>>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val userProfile = FirebaseEmployeeManager.getCurrentUser()

        if (userProfile != null && userProfile.collectionName == "user_employee_data") {
            val attendanceRecords = FirebaseEmployeeManager.getAttendanceHistory(userProfile.id)
            val scheduleRecords = FirebaseEmployeeManager.getUserSchedule(userProfile.id)

            val scheduleMap = scheduleRecords.associate { it.documentId to it.startTime }

            if (attendanceRecords.isNotEmpty()) {
                val dateFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                val currentTimeStr = dateFormat.format(Date())
                val currentTime = dateFormat.parse(currentTimeStr)

                var items = attendanceRecords.map { record ->
                    val startTimeStr = scheduleMap[record.documentId] ?: "00:00"

                    val parts = record.documentId.split("-")
                    val subject = parts.lastOrNull() ?: record.documentId
                    var formattedTitle = subject

                    if (parts.size >= 3) {
                        val gradePart = parts[0].replace("G", "Grade ")
                        val sectionPart = parts[1].lowercase()
                            .replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }
                        formattedTitle = "$subject - $gradePart $sectionPart"
                    }

                    val rawLabel = if (record.date.isNotEmpty()) {
                        record.date
                    } else if (record.timestamp != null) {
                        val sdf = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                        sdf.format(record.timestamp.toDate())
                    } else {
                        try {
                            val startTime = dateFormat.parse(startTimeStr)
                            if (currentTime != null && startTime != null && currentTime.before(startTime)) {
                                "Upcoming"
                            } else {
                                "Today"
                            }
                        } catch (e: Exception) {
                            "Today"
                        }
                    }

                    AttendanceItem(
                        title = formattedTitle,
                        status = record.status,
                        timeIn = record.timeIn,
                        timeOut = if (record.timeOut.isNotEmpty()) record.timeOut else "--:--",
                        date = rawLabel,
                        sortTime = startTimeStr
                    )
                }

                items = items.sortedBy { it.sortTime }

                val upcomingItems = items.filter { it.date == "Upcoming" }

                if (upcomingItems.size > 1) {
                    val firstUpcoming = upcomingItems.first()

                    items = items.map { item ->
                        if (item.date == "Upcoming" && item != firstUpcoming) {
                            item.copy(date = "Today")
                        } else {
                            item
                        }
                    }
                }

                attendanceMap = items
                    .groupBy { it.date }
                    .toSortedMap { d1, d2 ->
                        when {
                            d1 == "Upcoming" -> -1
                            d2 == "Upcoming" -> 1
                            d1 == "Today" -> -1
                            d2 == "Today" -> 1
                            else -> d2.compareTo(d1)
                        }
                    }
            } else {
                attendanceMap = emptyMap()
            }
            isLoading = false
        } else {
            errorMessage = "No Employee Record Found."
            isLoading = false
        }
    }

    val filteredAttendance = remember(attendanceMap, searchQuery) {
        if (searchQuery.isBlank()) {
            attendanceMap
        } else {
            attendanceMap.mapValues { (_, items) ->
                items.filter {
                    it.title.contains(searchQuery, true) ||
                            it.status.contains(searchQuery, true) ||
                            it.timeIn.contains(searchQuery, true)
                }
            }.filterValues { it.isNotEmpty() }
        }
    }

    if (showFeedbackDialog) {
        FeedbackDialog(onDismiss = { showFeedbackDialog = false })
    }

    Scaffold(
        bottomBar = { CustomBottomNavigation(navController, "attendance") }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color.White)
        ) {
            DashboardHeader(
                onProfileClick = { navController.navigate("profile") },
                onSendFeedbackClick = { showFeedbackDialog = true },
                onPoliciesClick = { showPolicies = true },
                onFAQClick = { showFAQ = true },
                onLogout = {
                    FirebaseEmployeeManager.signOut()
                    navController.navigate("login") {
                        popUpTo("home") { inclusive = true }
                    }
                },
                searchQuery = searchQuery,
                onSearchChange = { searchQuery = it }
            )

            HorizontalDivider(thickness = 1.dp, color = Color.LightGray)

            if (showPolicies) {
                PoliciesView(onBack = { showPolicies = false })
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    Text("Attendance", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("View your time ins and time outs", color = Color.Gray, fontSize = 14.sp)

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(thickness = 1.dp, color = Color.LightGray)
                    Spacer(modifier = Modifier.height(8.dp))

                    if (isLoading) {
                        Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Color(0xFFFF7F66))
                        }
                    } else if (errorMessage != null) {
                        Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                            Text(text = errorMessage!!, color = Color.Red)
                        }
                    } else if (filteredAttendance.isEmpty()) {
                        Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                            Text(text = if(searchQuery.isNotEmpty()) "No matching records found." else "No attendance records found.", color = Color.Gray)
                        }
                    } else {
                        filteredAttendance.forEach { (date, items) ->
                            AttendanceDateGroup(date, items)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AttendanceDateGroup(date: String, items: List<AttendanceItem>) {
    Column(modifier = Modifier.padding(vertical = 16.dp)) {
        Text(
            text = date,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        items.forEach { item ->
            AttendanceCard(item)
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
fun AttendanceCard(item: AttendanceItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, Color(0xFFEEEEEE), RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(45.dp)
                    .background(Color(0xFFFF7F66), RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = item.title.take(1).uppercase(),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Text(text = item.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(text = "Status: ${item.status}", color = Color.Gray, fontSize = 12.sp)

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Time In: ", fontSize = 13.sp, color = Color.Gray)
                        Text("Time Out:", fontSize = 13.sp, color = Color.Gray)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            val displayTimeIn = if (item.timeIn.isNotEmpty()) item.timeIn else "--:--"
                            Text(displayTimeIn, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.width(8.dp))
                            StatusChip(item.status)
                        }
                        val displayTimeOut = if (item.timeOut.isNotEmpty() && item.timeOut != "--:--") item.timeOut else "--:--"
                        Text(displayTimeOut, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val color = when(status.lowercase()) {
        "late" -> Color.Red
        "present" -> Color(0xFF4CAF50)
        else -> Color.Gray
    }
    Surface(
        color = color,
        shape = RoundedCornerShape(4.dp)
    ) {
        Text(
            text = status,
            color = Color.White,
            fontSize = 10.sp,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            fontWeight = FontWeight.Bold
        )
    }
}