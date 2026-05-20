package com.example.clockin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
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
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ScheduleItem(
    val title: String,
    val details: String,
    val sectionHeader: String,
    val displaySection: String,
    val day: String,
    val rawStartTime: String,
    val isUpcoming: Boolean = false,
    val isHappeningNow: Boolean = false,
)

@Composable
fun ScheduleScreen(navController: NavController) {
    var showPolicies by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showFAQ by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    val daysOfWeek = listOf("All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

    val daySortOrder = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

    var selectedDay by remember {
        val today = SimpleDateFormat("EEEE", Locale.US).format(Date())
        mutableStateOf(today)
    }

    var isDayDropdownExpanded by remember { mutableStateOf(false) }

    var allScheduleItems by remember { mutableStateOf<List<ScheduleItem>>(emptyList()) }
    var happeningNowItem by remember { mutableStateOf<ScheduleItem?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var userName by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        val user = SupabaseManager.getCurrentUser()
        userName = user?.name ?: "User"

        val records = SupabaseManager.getEmployeeSchedule()

        val dayFormat = SimpleDateFormat("EEEE", Locale.US)
        val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.US)
        val now = Date()
        val currentDay = dayFormat.format(now)
        val currentTime = timeFormat.format(now)

        if (records.isNotEmpty()) {
            val items =
                records.map { record ->
                    val displayRoom =
                        if (record.sectionDetails != null) {
                            "${record.sectionDetails.yearLevel} - ${record.sectionDetails.sectionName}"
                        } else {
                            record.sectionName
                        }

                    val isToday = record.weekday.equals(currentDay, ignoreCase = true)
                    val isHappening = isToday && currentTime >= record.startTime && currentTime <= record.endTime
                    val isUpcoming = isToday && record.startTime > currentTime

                    ScheduleItem(
                        title = record.subject,
                        details = formatScheduleTime(record.startTime, record.endTime),
                        sectionHeader = record.sectionName,
                        displaySection = displayRoom,
                        day = record.weekday,
                        rawStartTime = record.startTime,
                        isUpcoming = isUpcoming,
                        isHappeningNow = isHappening,
                    )
                }
            happeningNowItem = items.find { it.isHappeningNow }
            allScheduleItems = items
        }
        isLoading = false
    }

    val groupedSchedule =
        remember(allScheduleItems, searchQuery, selectedDay, happeningNowItem) {
            var list =
                allScheduleItems.filter {
                    val matchesSearch = it.title.contains(searchQuery, true) || it.details.contains(searchQuery, true)
                    val matchesDay = selectedDay == "All Days" || it.day.equals(selectedDay, ignoreCase = true)
                    val isNotDuplicate = it != happeningNowItem
                    matchesSearch && matchesDay && isNotDuplicate
                }

            if (selectedDay == "All Days") {
                list =
                    list.sortedWith(
                        compareBy<ScheduleItem> { daySortOrder.indexOf(it.day) }
                            .thenBy { it.rawStartTime },
                    )
                list.groupBy { it.day }
            } else {
                list = list.sortedBy { it.rawStartTime }
                list.groupBy { it.sectionHeader }
            }
        }

    if (showFeedbackDialog) {
        FeedbackDialog(onDismiss = { showFeedbackDialog = false })
    }

    Scaffold(
        bottomBar = { CustomBottomNavigation(navController, "schedule") },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color.White),
        ) {
            DashboardHeader(
                userName = userName,
                onProfileClick = { navController.navigate("profile") },
                onSendFeedbackClick = { showFeedbackDialog = true },
                onPoliciesClick = { showPolicies = true },
                onFAQClick = { showFAQ = true },
                onLogout = {
                    val scope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main)
                    scope.launch {
                        SupabaseManager.signOut()
                        navController.navigate("login") { popUpTo("home") { inclusive = true } }
                    }
                },
                searchQuery = searchQuery,
                onSearchChange = { searchQuery = it },
            )

            HorizontalDivider(thickness = 1.dp, color = Color(0xFFEEEEEE))

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
                    Text("Schedules", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("View and track class schedules.", color = Color.Gray, fontSize = 14.sp)

                    Spacer(modifier = Modifier.height(24.dp))

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = { isDayDropdownExpanded = true },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Black),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(text = "Filter by Day: $selectedDay")
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                        }

                        DropdownMenu(
                            expanded = isDayDropdownExpanded,
                            onDismissRequest = { isDayDropdownExpanded = false },
                            modifier = Modifier.fillMaxWidth(0.9f).background(Color.White),
                        ) {
                            daysOfWeek.forEach { day ->
                                DropdownMenuItem(
                                    text = { Text(day) },
                                    onClick = {
                                        selectedDay = day
                                        isDayDropdownExpanded = false
                                    },
                                )
                            }
                        }
                    }

                    if (!isLoading && happeningNowItem != null && (selectedDay == "All Days" || happeningNowItem?.day == selectedDay)) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Happening Now", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                        Spacer(modifier = Modifier.height(8.dp))
                        ScheduleCard(happeningNowItem!!)
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    HorizontalDivider(thickness = 1.dp, color = Color.Black)

                    if (isLoading) {
                        Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = ButtonOrange)
                        }
                    } else if (groupedSchedule.isEmpty()) {
                        Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                            val emptyMsg = if (searchQuery.isNotEmpty()) "No matching schedules found." else "No schedules found."
                            Text(text = emptyMsg, color = Color.Gray)
                        }
                    } else {
                        groupedSchedule.forEach { (headerTitle, items) ->
                            ScheduleDateGroup(headerTitle, items)
                        }
                    }
                }
            }
        }
    }
}

fun formatScheduleTime(
    start: String,
    end: String,
): String {
    fun cleanTime(t: String) = if (t.count { it == ':' } == 2) t.substringBeforeLast(':') else t
    return "${cleanTime(start)} - ${cleanTime(end)}"
}

@Composable
fun ScheduleDateGroup(
    headerTitle: String,
    items: List<ScheduleItem>,
) {
    Column(modifier = Modifier.padding(top = 8.dp, bottom = 16.dp)) {
        if (headerTitle.isNotEmpty()) {
            Text(text = headerTitle, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.padding(bottom = 8.dp))
        }

        items.forEach { item ->
            ScheduleCard(item)
            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}

@Composable
fun ScheduleCard(item: ScheduleItem) {
    val borderColor = if (item.isHappeningNow || item.isUpcoming) ButtonOrange else Color(0xFFEEEEEE)

    Card(
        modifier =
            Modifier
                .fillMaxWidth()
                .border(1.dp, borderColor, RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier =
                    Modifier
                        .size(45.dp)
                        .background(ButtonOrange, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = item.title.take(1).uppercase(),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = item.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    if (item.isHappeningNow || item.isUpcoming) {
                        Surface(
                            color = ButtonOrange.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(4.dp),
                        ) {
                            Text(
                                text = if (item.isHappeningNow) "HAPPENING NOW" else "UPCOMING",
                                color = ButtonOrange,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            )
                        }
                    }
                }
                Text(
                    text = "Grade ${item.displaySection}",
                    color = Color.DarkGray,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                )
                Text(text = item.details, color = Color.Gray, fontSize = 12.sp)
                if (item.day.isNotEmpty()) {
                    Text(
                        text = item.day,
                        color = ButtonOrange,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
    }
}
