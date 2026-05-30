package com.example.clockin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.clockin.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class AttendanceItem(
    val title: String,
    val status: String,
    val timeIn: String,
    val timeOut: String,
    val date: String,
)

@Composable
fun AttendanceScreen(navController: NavController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val isConnected by remember(context) { NetworkObserver(context).isConnected }.collectAsState(initial = true)
    val coroutineScope = rememberCoroutineScope()
    var showPolicies by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showFAQ by remember { mutableStateOf(false) }

    var searchQuery by remember { mutableStateOf("") }
    var selectedStatusFilter by remember { mutableStateOf("All") }

    var attendanceMap by remember { mutableStateOf<Map<String, List<AttendanceItem>>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var userName by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        val user = SupabaseManager.getCurrentUser()
        userName = user?.name ?: "User"

        val attendanceRecords = SupabaseManager.getAttendanceWithSchedule()

        if (attendanceRecords.isNotEmpty()) {
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            val displayDateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())

            val items =
                attendanceRecords.mapNotNull { record ->
                    val schedule = record.schedule
                    val subject = schedule?.subject ?: "Unknown"
                    val section =
                        schedule?.sectionDetails?.sectionName
                            ?: schedule?.sectionName
                            ?: "Unknown"

                    val formattedTitle = "$subject - $section"

                    val isAbsent = record.status.equals("Absent", true)
                    val displayTimeIn = if (isAbsent) "--:--" else formatTime(record.timeIn)
                    val displayTimeOut = if (isAbsent) "--:--" else formatTime(record.timeOut)

                    val rawLabel =
                        if (isAbsent) {
                            displayDateFormat.format(Date())
                        } else if (record.timeIn != null) {
                            try {
                                val dateObj = isoFormat.parse(record.timeIn)
                                if (dateObj != null) displayDateFormat.format(dateObj) else "Recent"
                            } catch (e: Exception) {
                                "Recent"
                            }
                        } else {
                            "Recent"
                        }

                    AttendanceItem(
                        title = formattedTitle,
                        status = record.status,
                        timeIn = displayTimeIn,
                        timeOut = displayTimeOut,
                        date = rawLabel,
                    )
                }

            attendanceMap =
                items
                    .groupBy { it.date }
                    .toSortedMap(compareByDescending { it })
        } else {
            attendanceMap = emptyMap()
        }
        isLoading = false
    }

    val filteredAttendance =
        remember(attendanceMap, searchQuery, selectedStatusFilter) {
            val baseMap =
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

            if (selectedStatusFilter == "All") {
                baseMap
            } else {
                baseMap.mapValues { (_, items) ->
                    items.filter { it.status.equals(selectedStatusFilter, ignoreCase = true) }
                }.filterValues { it.isNotEmpty() }
            }
        }

    if (showFeedbackDialog) {
        FeedbackDialog(onDismiss = { showFeedbackDialog = false })
    }

    Scaffold(
        bottomBar = { CustomBottomNavigation(navController, "attendance") },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(androidx.compose.material3.MaterialTheme.colorScheme.background),
        ) {
            OfflineIndicator(isConnected = isConnected)

            DashboardHeader(
                userName = userName,
                onProfileClick = { navController.navigate("profile") },
                onSendFeedbackClick = { showFeedbackDialog = true },
                onPoliciesClick = { showPolicies = true },
                onFAQClick = { showFAQ = true },
                onLogout = {
                    coroutineScope.launch {
                        SupabaseManager.signOut()
                        navController.navigate("login") {
                            popUpTo("home") { inclusive = true }
                        }
                    }
                },
                searchQuery = searchQuery,
                onSearchChange = { searchQuery = it },
            )

            HorizontalDivider(thickness = 1.dp, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f))

            if (showPolicies) {
                PoliciesView(onBack = { showPolicies = false })
            } else if (showFAQ) {
                FAQView(onBack = { showFAQ = false })
            } else {
                Column(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                ) {
                    Text("Attendance History", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("View your past clock-ins", color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)

                    Spacer(modifier = Modifier.height(12.dp))

                    val filterOptions = listOf("All", "Present", "Late", "Absent", "Incomplete")
                    Row(
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState())
                                .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        filterOptions.forEach { option ->
                            val isSelected = selectedStatusFilter == option
                            val chipColor = if (isSelected) PrimaryOrange else androidx.compose.material3.MaterialTheme.colorScheme.surfaceVariant
                            val textColor = if (isSelected) Color.White else androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant
                            Box(
                                modifier =
                                    Modifier
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(chipColor)
                                        .clickable { selectedStatusFilter = option }
                                        .padding(horizontal = 16.dp, vertical = 6.dp),
                            ) {
                                Text(
                                    text = option,
                                    color = textColor,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(thickness = 1.dp, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f))
                    Spacer(modifier = Modifier.height(8.dp))

                    if (isLoading) {
                        Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = PrimaryOrange)
                        }
                    } else if (errorMessage != null) {
                        Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                            Text(text = errorMessage!!, color = Color.Red)
                        }
                    } else if (filteredAttendance.isEmpty()) {
                        Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                            Text(
                                text = if (searchQuery.isNotEmpty()) "No matching records found." else "No attendance records yet.",
                                color = Color.Gray,
                            )
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

fun formatTime(isoString: String?): String {
    if (isoString.isNullOrEmpty()) return "--:--"
    return try {
        val input = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val output = SimpleDateFormat("HH:mm", Locale.getDefault())
        val d = input.parse(isoString)
        if (d != null) output.format(d) else isoString
    } catch (e: Exception) {
        "--:--"
    }
}

@Composable
fun AttendanceDateGroup(
    date: String,
    items: List<AttendanceItem>,
) {
    Column(modifier = Modifier.padding(vertical = 16.dp)) {
        Text(
            text = date,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.padding(bottom = 12.dp),
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
        modifier =
            Modifier
                .fillMaxWidth()
                .border(1.dp, androidx.compose.material3.MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f), RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            InitialAvatar(
                initial = item.title.take(1).uppercase(),
                size = 45.dp,
                shape = RoundedCornerShape(8.dp),
            )

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Text(text = item.title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurface)
                Text(text = "Status: ${item.status}", color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Time In: ", fontSize = 13.sp, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Time Out:", fontSize = 13.sp, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(item.timeIn, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurface)
                            Spacer(modifier = Modifier.width(8.dp))
                            StatusChip(item.status)
                        }
                        Text(item.timeOut, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val color =
        when (status.lowercase()) {
            "late" -> Color.Red
            "present" -> Color(0xFF4CAF50)
            "incomplete" -> Color.Gray
            "absent" -> Color.Gray
            else -> Color.DarkGray
        }
    Surface(
        color = color,
        shape = RoundedCornerShape(4.dp),
    ) {
        Text(
            text = status,
            color = Color.White,
            fontSize = 10.sp,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            fontWeight = FontWeight.Bold,
        )
    }
}
