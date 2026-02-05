package com.example.clockin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
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
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material3.ButtonDefaults
import android.util.Log

data class ScheduleItem(
    val title: String,
    val details: String,
    val sectionHeader: String,
    val displaySection: String,
    val day: String,
    val rawStartTime: String
)

@Composable
fun ScheduleScreen(navController: NavController) {
    var showPolicies by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showFAQ by remember { mutableStateOf(false) }

    var searchQuery by remember { mutableStateOf("") }
    
    val daysOfWeek = listOf("All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
    var selectedDay by remember { mutableStateOf("All Days") }
    var isDayDropdownExpanded by remember { mutableStateOf(false) }

    var scheduleMap by remember { mutableStateOf<Map<String, List<ScheduleItem>>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    var userName by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        val user = SupabaseManager.getCurrentUser()
        userName = user?.name ?: "User"

        val records = SupabaseManager.getEmployeeSchedule()
        val sectionData = SupabaseManager.getAllSections()

        val sectionLookup = sectionData.associate {
            val id = it["sectId"]?.toString()?.trim() ?: ""
            val name = it["sectionName"]?.toString() ?: ""
            val year = it["yearLevel"]?.toString() ?: ""
            id to "$year - $name"
        }

        Log.d("LookupDebug", "Lookup Map Keys: ${sectionLookup.keys}")
        Log.d("LookupDebug", "First Schedule sectId: ${records.firstOrNull()?.sectId}")

        if (records.isNotEmpty()) {
            val items = records.map { record ->
                val searchId = record.sectId.trim()
                val displayRoom = sectionLookup[record.sectId] ?: "Room Not Found"
                ScheduleItem(
                    title = record.subject,
                    details = formatScheduleTime(record.startTime, record.endTime),
                    sectionHeader = record.sectionName,
                    displaySection = displayRoom,
                    day = record.weekday,
                    rawStartTime = record.startTime
                )
            }
            scheduleMap = items.groupBy { it.sectionHeader }.toSortedMap()
        } else {
            scheduleMap = emptyMap()
        }
        isLoading = false
    }

    val filteredSchedule = remember(scheduleMap, searchQuery, selectedDay) {
        scheduleMap.mapValues { (_, items) ->
            items.filter {
                val matchesSearch = it.title.contains(searchQuery, true) ||
                        it.details.contains(searchQuery, true)
                val matchesDay = selectedDay == "All Days" || it.day.equals(selectedDay, ignoreCase = true)
                matchesSearch && matchesDay
            }.sortedBy { item ->
                // Pad with zero so "7:00" becomes "07:00", ensuring 0 comes before 1
                item.rawStartTime.padStart(5, '0')
            }
        }.filterValues { it.isNotEmpty() }
    }

    if (showFeedbackDialog) {
        FeedbackDialog(onDismiss = { showFeedbackDialog = false })
    }

    Scaffold(
        bottomBar = { CustomBottomNavigation(navController, "schedule") }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color.White)
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
                        navController.navigate("login") {
                            popUpTo("home") { inclusive = true }
                        }
                    }
                },
                searchQuery = searchQuery,
                onSearchChange = { searchQuery = it }
            )

            HorizontalDivider(thickness = 1.dp, color = Color(0xFFEEEEEE))

            if (showPolicies) {
                PoliciesView(onBack = { showPolicies = false })
            } else if (showFAQ) {
                FAQView(onBack = { showFAQ = false })
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    Text("Schedules", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text(
                        "View and track class schedules.",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Day Selector Dropdown
                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = { isDayDropdownExpanded = true },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Black)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = "Filter by Day: $selectedDay")
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                        }

                        DropdownMenu(
                            expanded = isDayDropdownExpanded,
                            onDismissRequest = { isDayDropdownExpanded = false },
                            modifier = Modifier.fillMaxWidth(0.9f).background(Color.White)
                        ) {
                            daysOfWeek.forEach { day ->
                                DropdownMenuItem(
                                    text = { Text(day) },
                                    onClick = {
                                        selectedDay = day
                                        isDayDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(thickness = 1.dp, color = Color(0xFFEEEEEE))
                    Spacer(modifier = Modifier.height(8.dp))

                    if (isLoading) {
                        Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = PrimaryOrange)
                        }
                    } else if (filteredSchedule.isEmpty()) {
                        Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                            val emptyMsg = when {
                                searchQuery.isNotEmpty() -> "No matching schedules found."
                                selectedDay != "All Days" -> "No schedules found for $selectedDay."
                                else -> "No schedules found."
                            }
                            Text(text = emptyMsg, color = Color.Gray)
                        }
                    } else {
                        filteredSchedule.forEach { (section, items) ->
                            ScheduleDateGroup(section, items)
                        }
                    }
                }
            }
        }
    }
}

fun formatScheduleTime(start: String, end: String): String {
    fun cleanTime(t: String): String {
        return if (t.count { it == ':' } == 2) t.substringBeforeLast(':') else t
    }
    return "${cleanTime(start)} - ${cleanTime(end)}"
}

@Composable
fun ScheduleDateGroup(sectionName: String, items: List<ScheduleItem>) {
    Column(modifier = Modifier.padding(vertical = 16.dp)) {
        Text(
            text = sectionName,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        items.forEach { item ->
            ScheduleCard(item)
            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}

@Composable
fun ScheduleCard(item: ScheduleItem) {
    Card(
        modifier = Modifier.fillMaxWidth().border(1.dp, Color(0xFFEEEEEE), RoundedCornerShape(12.dp)),
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
                    .background(PrimaryOrange, RoundedCornerShape(8.dp)),
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

                Text(
                    text = "Room: ${item.displaySection}",
                    color = Color.DarkGray,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )

                Text(text = item.details, color = Color.Gray, fontSize = 12.sp)
                if (item.day.isNotEmpty()) {
                    Text(text = item.day, color = PrimaryOrange, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}