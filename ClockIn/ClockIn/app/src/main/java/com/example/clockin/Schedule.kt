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

data class ScheduleItem(
    val title: String,
    val details: String,
    val sectionHeader: String
)

@Composable
fun ScheduleScreen(navController: NavController) {
    var showPolicies by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showFAQ by remember { mutableStateOf(false) }

    var searchQuery by remember { mutableStateOf("") }

    var scheduleMap by remember { mutableStateOf<Map<String, List<ScheduleItem>>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    var userName by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        val user = SupabaseManager.getCurrentUser()
        userName = user?.name ?: "User"

        val records = SupabaseManager.getEmployeeSchedule()

        if (records.isNotEmpty()) {
            val items = records.map { record ->
                ScheduleItem(
                    title = record.subject,
                    details = formatScheduleTime(record.startTime, record.endTime),
                    sectionHeader = record.sectionName
                )
            }
            scheduleMap = items.groupBy { it.sectionHeader }.toSortedMap()
        } else {
            scheduleMap = emptyMap()
        }
        isLoading = false
    }

    val filteredSchedule = remember(scheduleMap, searchQuery) {
        if (searchQuery.isBlank()) {
            scheduleMap
        } else {
            scheduleMap.mapValues { (_, items) ->
                items.filter {
                    it.title.contains(searchQuery, true) ||
                            it.details.contains(searchQuery, true)
                }
            }.filterValues { it.isNotEmpty() }
        }
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
                    HorizontalDivider(thickness = 1.dp, color = Color(0xFFEEEEEE))
                    Spacer(modifier = Modifier.height(8.dp))

                    if (isLoading) {
                        Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = PrimaryOrange)
                        }
                    } else if (filteredSchedule.isEmpty()) {
                        Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                            Text(text = if(searchQuery.isNotEmpty()) "No matching schedules found." else "No schedules found.", color = Color.Gray)
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
                Text(text = item.details, color = Color.Gray, fontSize = 12.sp)
            }
        }
    }
}