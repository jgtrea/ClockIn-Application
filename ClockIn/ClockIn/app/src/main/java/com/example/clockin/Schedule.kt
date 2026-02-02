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
import java.util.Locale

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
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val userProfile = FirebaseEmployeeManager.getCurrentUser()

        if (userProfile != null && userProfile.collectionName == "user_employee_data") {
            val records = FirebaseEmployeeManager.getUserSchedule(userProfile.id)

            if (records.isNotEmpty()) {
                val items = records.map { record ->
                    val sectionName = formatSectionName(record.documentId)

                    ScheduleItem(
                        title = record.subject,
                        details = "${record.startTime} - ${record.endTime}",
                        sectionHeader = sectionName
                    )
                }

                scheduleMap = items.groupBy { it.sectionHeader }.toSortedMap()
            } else {
                scheduleMap = emptyMap()
            }
            isLoading = false
        } else {
            errorMessage = "No Employee Record Found."
            isLoading = false
        }
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

fun formatSectionName(rawId: String): String {
    val parts = rawId.split("-")
    if (parts.size >= 2) {
        val gradePart = parts[0].replace("G", "Grade ")
        val sectionPart = parts[1].lowercase()
            .replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }

        return "$gradePart $sectionPart"
    }
    return rawId
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
                Text(text = item.details, color = Color.Gray, fontSize = 12.sp)
            }
        }
    }
}