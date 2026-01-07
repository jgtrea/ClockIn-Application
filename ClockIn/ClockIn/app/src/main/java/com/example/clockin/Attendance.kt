package com.example.clockin

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.compose.runtime.*

// Data model for the attendance list
data class AttendanceItem(
    val title: String,
    val details: String,
    val timeIn: String,
    val timeOut: String,
    val isLate: Boolean = false
)

@Composable
fun AttendanceScreen(navController: NavController) {
    var showPolicies by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showFAQ by remember { mutableStateOf(false) }

    // 2. SHOW THE DIALOG CONDITIONALLY
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
            // 1. Shared Header (Matches Home and Schedule)
            DashboardHeader(
                onProfileClick = { navController.navigate("profile") },
                onSendFeedbackClick = { showFeedbackDialog = true },
                onPoliciesClick = { showPolicies = true },
                onFAQClick = { showFAQ = true },
                onLogout = {
                    navController.navigate("login") {
                        popUpTo("home") { inclusive = true }
                    }
                })

            // 2. Edge-to-Edge Divider
            HorizontalDivider(thickness = 1.dp, color = Color.LightGray)

            if (showPolicies) {
                // If showPolicies is true, display the Policies screen content
                PoliciesView(onBack = { showPolicies = false })
            } else {

                // 3. Scrollable Body Content
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp) // Standardized 16dp padding
                ) {
                    // Title Section
                    Text("Attendance", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("view your time ins and time outs", color = Color.Gray, fontSize = 14.sp)

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(thickness = 1.dp, color = Color.LightGray)
                    Spacer(modifier = Modifier.height(8.dp))

                    // Friday Group
                    AttendanceDateGroup(
                        "Friday - 2025/11/09", listOf(
                            AttendanceItem(
                                "T001 - Math",
                                "Math | R001 | Mon 8:00 - 9:30",
                                "7:55",
                                "10:00"
                            ),
                            AttendanceItem(
                                "T002 - Math",
                                "Math | R010 | Mon 9:30 - 11:00",
                                "1:30",
                                "2:58",
                                isLate = true
                            ),
                            AttendanceItem(
                                "T003 - Math",
                                "Math | R008 | Mon 1:00 - 2:30",
                                "3:02",
                                "5:05"
                            )
                        )
                    )

                    // Monday Group
                    AttendanceDateGroup(
                        "Monday - 2025/11/10", listOf(
                            AttendanceItem(
                                "T001 - Math",
                                "Math | R001 | Mon 8:00 - 9:30",
                                "7:50",
                                "--:--"
                            )
                        )
                    )
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
            Spacer(modifier = Modifier.height(12.dp))
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
            // Placeholder for icon box
            Box(
                modifier = Modifier
                    .size(45.dp)
                    .border(1.dp, Color.LightGray, RoundedCornerShape(8.dp))
            )

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Text(text = item.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(text = item.details, color = Color.Gray, fontSize = 12.sp)

                Spacer(modifier = Modifier.height(8.dp))

                // Status Section (Time In/Out)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Time In: ", fontSize = 13.sp, color = Color.Gray)
                        Text("Time Out:", fontSize = 13.sp, color = Color.Gray)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(item.timeIn, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            if (item.isLate) { // Red late badge
                                Spacer(modifier = Modifier.width(8.dp))
                                Surface(
                                    color = Color.Red,
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        "late",
                                        color = Color.White,
                                        fontSize = 10.sp,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                        Text(item.timeOut, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}