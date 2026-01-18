package com.example.clockin

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController

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

    var attendanceMap by remember { mutableStateOf<Map<String, List<AttendanceItem>>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val userProfile = FirebaseEmployeeManager.getCurrentUser()

        if (userProfile != null && userProfile.collectionName == "user_employee_data") {
            val records = FirebaseEmployeeManager.getAttendanceHistory(userProfile.id)

            if (records.isNotEmpty()) {
                val items = records.map { record ->
                    AttendanceItem(
                        title = "Room: ${record.room}",
                        details = "Status: ${record.status}",
                        timeIn = record.time_in,
                        timeOut = if (record.time_out.isNotEmpty()) record.time_out else "--:--",
                        isLate = record.status == "Late"
                    ) to record.date
                }
                attendanceMap = items.groupBy({ it.second }, { it.first })
            } else {
                attendanceMap = emptyMap()
            }
            isLoading = false
        } else {
            errorMessage = "No Employee Record Found."
            isLoading = false
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
                })

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
                    } else if (attendanceMap.isEmpty()) {
                        Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                            Text(text = "No attendance records found.", color = Color.Gray)
                        }
                    } else {
                        attendanceMap.forEach { (date, items) ->
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
                    .border(1.dp, Color.LightGray, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Text(text = item.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(text = item.details, color = Color.Gray, fontSize = 12.sp)

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Time In: ", fontSize = 13.sp, color = Color.Gray)
                        Text("Time Out:", fontSize = 13.sp, color = Color.Gray)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(item.timeIn, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            if (item.isLate) {
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