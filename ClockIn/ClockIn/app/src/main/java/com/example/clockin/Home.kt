package com.example.clockin

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.CropFree
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sensors
import androidx.compose.material.icons.outlined.Inventory
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.navigation.NavController
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

val PrimaryOrange = Color(0xFFFF7F66)

@Composable
fun DashboardScreen(
    navController: NavController,
    beaconDistance: Double,
    deviceName: String,
    statusMessage: String,
    onActiveAttendanceIdChanged: (String?) -> Unit,
    onTargetBleChanged: (String, Long, String) -> Unit,
    onRefreshBeacon: () -> Unit = {},
    isBeaconFound: Boolean,
    onLogout: () -> Unit,
    onProfileClick: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var showPolicies by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showFAQ by remember { mutableStateOf(false) }

    var searchQuery by remember { mutableStateOf("") }
    var notifications by remember { mutableStateOf<List<NotificationItem>>(emptyList()) }
    var isLoadingNotifs by remember { mutableStateOf(true) }

    var currentSectionTitle by remember { mutableStateOf("Checking Schedule...") }
    var userName by remember { mutableStateOf("User") }
    var activeAttendanceId by remember { mutableStateOf<String?>(null) }
    var isUpcomingClass by remember { mutableStateOf(false) }
    var canClockInEarly by remember { mutableStateOf(false) }

    var currentAttendanceStatus by remember { mutableStateOf<String?>(null) }

    val refreshDashboard = {
        onRefreshBeacon()
        scope.launch(Dispatchers.IO) {
            val user = SupabaseManager.getCurrentUser()
            val userEmail = user?.email ?: ""
            userName = user?.name ?: "User"

            try {
                val result = SupabaseManager.client.from("notification")
                    .select {
                        order("dataCreated", Order.DESCENDING)
                        limit(10)
                    }
                    .decodeList<NotificationItem>()

                val userNotifications = result.filter {
                    val targets = it.target?.split(",")?.map { t -> t.trim() } ?: emptyList()
                    targets.any { t -> t.equals("everyone", true) || t.equals(userEmail, true) }
                }
                notifications = userNotifications

                val newNotifications = NotificationTracker.filterNewNotifications(userNotifications)
                newNotifications.forEach { notif ->
                    NotificationManager.show(notif.header, notif.message, 5000L)
                    NotificationTracker.markAsShown(context, notif.notifId)
                }
                NotificationTracker.cleanup(context)

            } catch (e: Exception) { e.printStackTrace() } finally { isLoadingNotifs = false }

            val classInfo = SupabaseManager.getCurrentClassBeacon()
            val attId = SupabaseManager.getActiveAttendanceId()
            activeAttendanceId = attId
            onActiveAttendanceIdChanged(attId)

            val excludedSubjects = listOf("Health Break", "Lunch Break")

            if (classInfo != null) {
                isUpcomingClass = classInfo.isUpcoming
                
                if (isUpcomingClass) {
                    val now = Date()
                    val diff = classInfo.startTime.time - now.time
                    canClockInEarly = diff <= 10 * 60 * 1000
                } else {
                    canClockInEarly = false
                }

                val isBreak = excludedSubjects.any { it.equals(classInfo.subject.trim(), ignoreCase = true) }

                if (isBreak) {
                    currentSectionTitle = classInfo.subject
                    currentAttendanceStatus = "Break"
                    onTargetBleChanged("", 0L, "")
                    activeAttendanceId = null
                    onActiveAttendanceIdChanged(null)
                } else {
                    currentSectionTitle = classInfo.sectionDisplay

                    val attendanceRecord = SupabaseManager.getTodayAttendance(classInfo.schedId)
                    currentAttendanceStatus = attendanceRecord?.status

                    val isAbsent = attendanceRecord?.status.equals("Absent", true)
                    val isIncomplete = attendanceRecord?.status.equals("Incomplete", true)
                    val isFinished = attendanceRecord != null && attendanceRecord.timeOut != null

                    if (isAbsent || isIncomplete || isFinished) {
                        onTargetBleChanged("", 0L, "")
                        if (isFinished) {
                            activeAttendanceId = null
                            onActiveAttendanceIdChanged(null)
                        }
                    } else {
                        onTargetBleChanged(
                            classInfo.targetBeaconName,
                            classInfo.startTime.time,
                            classInfo.schedId
                        )
                    }
                }
            } else {
                currentSectionTitle = "No Active Class"
                currentAttendanceStatus = null
                isUpcomingClass = false
                canClockInEarly = false
                onTargetBleChanged("", 0L, "")
                activeAttendanceId = null
                onActiveAttendanceIdChanged(null)
            }
        }
    }

    androidx.compose.runtime.DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                refreshDashboard()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val filteredNotifications = remember(notifications, searchQuery) {
        if (searchQuery.isBlank()) notifications else notifications.filter {
            it.header.contains(searchQuery, true) || it.message.contains(searchQuery, true)
        }
    }

    if (showFeedbackDialog) FeedbackDialog(onDismiss = { showFeedbackDialog = false })

    Scaffold(
        bottomBar = { CustomBottomNavigation(navController, "home") }
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
                onLogout = onLogout,
                onPoliciesClick = { showPolicies = true },
                onFAQClick = { showFAQ = true },
                onSendFeedbackClick = { showFeedbackDialog = true },
                searchQuery = searchQuery,
                onSearchChange = { searchQuery = it }
            )

            HorizontalDivider(thickness = 1.dp, color = Color.LightGray)

            if (showPolicies) PoliciesView(onBack = { showPolicies = false })
            else if (showFAQ) FAQView(onBack = { showFAQ = false })
            else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    SectionHeader(title = "Current Class", icon = Icons.Default.Schedule)

                    val titleText = when {
                        currentAttendanceStatus == "Break" -> "Current Schedule: $currentSectionTitle"
                        isUpcomingClass -> "Upcoming Class: $currentSectionTitle"
                        else -> "Section: $currentSectionTitle"
                    }

                    val displayText = when {
                        currentAttendanceStatus == "Break" -> "Take a well-deserved break! ☕"
                        activeAttendanceId != null -> "Status: CLOCKED IN (Session Active)"
                        currentAttendanceStatus?.equals("Absent", true) == true -> "Status: ABSENT"
                        currentAttendanceStatus?.equals("Incomplete", true) == true -> "Status: INCOMPLETE"
                        currentAttendanceStatus != null && activeAttendanceId == null -> "Status: CLOCKED OUT"
                        isUpcomingClass && canClockInEarly -> "You can clock in early for this class."
                        isUpcomingClass -> "Scanning will be available 10 minutes before class."
                        currentSectionTitle.contains("No Active") -> "Relax! No classes scheduled."
                        else -> "Please scan QR to Clock In."
                    }

                    InfoCard(
                        title = titleText,
                        text = displayText
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    SectionHeader(title = "Beacon Status", icon = Icons.Default.Bluetooth)

                    val statusColor = when {
                        statusMessage.contains("Connected") || statusMessage.contains("Beacon Found") -> Color(0xFF4CAF50)
                        statusMessage.contains("Grace") -> Color(0xFF2196F3)
                        statusMessage.contains("OUT OF RANGE") -> Color.Red
                        else -> Color(0xFFFFA726)
                    }

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { refreshDashboard() },
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color.LightGray)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Sensors,
                                    contentDescription = null,
                                    tint = statusColor
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = statusMessage,
                                    fontSize = 14.sp,
                                    color = statusColor,
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            if (!isBeaconFound && !statusMessage.contains("Idle") && !statusMessage.contains("No Active")) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Make sure Bluetooth and Location are ON",
                                    fontSize = 11.sp,
                                    color = Color.Gray,
                                    modifier = Modifier.padding(start = 36.dp)
                                )
                            }
                            
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Tap to refresh",
                                fontSize = 10.sp,
                                color = Color.LightGray,
                                modifier = Modifier.align(Alignment.End)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    SectionHeader(title = "Notifications", icon = Icons.Default.NotificationsNone)

                    if (isLoadingNotifs) {
                        Box(modifier = Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = PrimaryOrange, modifier = Modifier.size(24.dp))
                        }
                    } else if (filteredNotifications.isEmpty()) {
                        Text(
                            if(searchQuery.isNotEmpty()) "No matching notifications" else "No new notifications",
                            color = Color.Gray,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )
                    } else {
                        filteredNotifications.forEach { item ->
                            val dateStr = formatNotificationDate(item.dateCreated ?: "")
                            InfoCard(title = "${item.header} ($dateStr):", text = item.message)
                            Spacer(modifier = Modifier.height(12.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun UserMenuHeader() {
    var userEmail by remember { mutableStateOf("") }
    var userName by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        val userProfile = SupabaseManager.getCurrentUser()
        userName = userProfile?.name ?: "Guest User"
        userEmail = userProfile?.email ?: ""
    }

    Row(
        modifier = Modifier.padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier.size(40.dp).clip(CircleShape).background(Color(0xFFFF7F66)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = userName.firstOrNull()?.uppercase() ?: "",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(text = if (userName.isNotEmpty()) userName else "Loading...", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(text = userEmail, color = Color.Gray, fontSize = 10.sp)
        }
    }
}

@Composable
fun DashboardHeader(
    userName: String,
    onProfileClick: () -> Unit,
    onLogout: () -> Unit,
    onSendFeedbackClick: () -> Unit,
    onPoliciesClick: () -> Unit,
    onFAQClick: () -> Unit,
    searchQuery: String,
    onSearchChange: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    Row(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(modifier = Modifier.weight(1f)) {
            SearchField(label = "Search...", value = searchQuery, onValueChange = onSearchChange, isHighlighted = false)
        }
        Spacer(modifier = Modifier.width(16.dp))
        Box {
            Box(
                modifier = Modifier.size(50.dp).clip(CircleShape).background(Color(0xFFFF7F66)).clickable { expanded = true },
                contentAlignment = Alignment.Center
            ) {
                Text(text = userName.firstOrNull()?.uppercase() ?: "", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }, modifier = Modifier.background(Color.White).width(240.dp)) {
                UserMenuHeader()
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                MenuActionItem(Icons.Outlined.Person, "Profile") { expanded = false; onProfileClick() }
                MenuActionItem(Icons.AutoMirrored.Outlined.Assignment, "Send Feedback") { expanded = false; onSendFeedbackClick() }
                MenuActionItem(Icons.Outlined.Inventory, "Policies") { expanded = false; onPoliciesClick() }
                MenuActionItem(Icons.AutoMirrored.Outlined.HelpOutline, "Help") { expanded = false; onFAQClick() }
                MenuActionItem(Icons.AutoMirrored.Outlined.Logout, "Logout") { expanded = false; onLogout() }
            }
        }
    }
}

@Composable
fun CustomBottomNavigation(navController: NavController, currentRoute: String) {
    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp), shadowElevation = 8.dp, color = Color.White) {
        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically) {
            SelectableNavItem(Icons.Default.Home, "Home", currentRoute == "home") {
                if (currentRoute != "home") navController.navigate("home") { popUpTo("home") { saveState = true }; launchSingleTop = true }
            }
            SelectableNavItem(Icons.Default.CropFree, "Scan QR", currentRoute == "scan_qr") { if (currentRoute != "scan_qr") navController.navigate("scan_qr") }
            SelectableNavItem(Icons.Default.DateRange, "Schedule", currentRoute == "schedule") { if (currentRoute != "schedule") navController.navigate("schedule") }
            SelectableNavItem(Icons.Default.Schedule, "Attendance", currentRoute == "attendance") { if (currentRoute != "attendance") navController.navigate("attendance") }
        }
    }
}

@Composable
fun SelectableNavItem(icon: ImageVector, label: String, isSelected: Boolean, onClick: () -> Unit) {
    Column(modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(if (isSelected) PrimaryOrange else Color.Transparent).clickable { onClick() }.padding(horizontal = 20.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, contentDescription = null, tint = if (isSelected) Color.White else Color.Black)
        Text(text = label, color = if (isSelected) Color.White else Color.Black, fontSize = 12.sp)
    }
}

@Composable
fun MenuActionItem(icon: ImageVector, label: String, onClick: () -> Unit) {
    DropdownMenuItem(text = { Text(label, fontWeight = FontWeight.Medium) }, leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp)) }, onClick = onClick)
}

@Composable
fun SearchField(label: String, value: String, onValueChange: (String) -> Unit, isHighlighted: Boolean) {
    val borderColor = if (isHighlighted) PrimaryOrange else Color.LightGray
    BasicTextField(value = value, onValueChange = onValueChange, textStyle = TextStyle(fontSize = 16.sp, color = Color.Black), singleLine = true, decorationBox = { innerTextField ->
        Row(modifier = Modifier.fillMaxWidth().border(1.5.dp, borderColor, RoundedCornerShape(12.dp)).padding(horizontal = 12.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)
            Spacer(modifier = Modifier.width(8.dp))
            Box {
                if (value.isEmpty()) Text(text = label, color = Color.Gray, fontSize = 16.sp)
                innerTextField()
            }
        }
    })
}

@Composable
fun SectionHeader(title: String, icon: ImageVector) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(text = title, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Icon(icon, contentDescription = null)
    }
    HorizontalDivider(modifier = Modifier.padding(top = 8.dp, bottom = 16.dp), thickness = 1.dp, color = Color.Black)
}

@Composable
fun InfoCard(title: String? = null, text: String) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color.White), border = CardDefaults.outlinedCardBorder()) {
        Column(modifier = Modifier.padding(16.dp)) {
            if (title != null) {
                Text(text = title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(4.dp))
            }
            Text(text = text, fontSize = 13.sp, color = Color.DarkGray)
        }
    }
}

@Composable
fun PoliciesView(onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally) {
        Button(onClick = onBack, modifier = Modifier.align(Alignment.End), colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange), shape = RoundedCornerShape(8.dp)) { Text("Back", color = Color.White) }
        Spacer(modifier = Modifier.height(24.dp))
        Text("Privacy Statement", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Text("We value your privacy and all personal information collected securely.", fontSize = 12.sp, color = Color.Gray, textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 32.dp, vertical = 8.dp))
        Spacer(modifier = Modifier.height(24.dp))
        Text("Data Privacy Policy Statement", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = "The Data Privacy Act of 2012 (Republic Act No. 10173) upholds the fundamental right to privacy...", fontSize = 13.sp, textAlign = TextAlign.Justify, lineHeight = 18.sp)
    }
}

@Composable
fun FAQView(onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally) {
        Button(onClick = onBack, modifier = Modifier.align(Alignment.End), colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange), shape = RoundedCornerShape(8.dp)) { Text("Back", color = Color.White) }
        Spacer(modifier = Modifier.height(24.dp))
        Text("Frequently asked Questions", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(24.dp))
        FAQItem(question = "How does the system work?", answer = "The system tracks your clock-in and clock-out times via QR code scanning.")
        FAQItem(question = "Can it detect late log-outs?", answer = "The system automatically records the exact time of each scan.", initialExpanded = true)
    }
}

@Composable
fun FAQItem(question: String, answer: String, initialExpanded: Boolean = false, isPlaceholder: Boolean = false) {
    var expanded by remember { mutableStateOf(initialExpanded) }
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color.White), border = BorderStroke(1.dp, Color(0xFFE0E0E0))) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (isPlaceholder) { Spacer(modifier = Modifier.weight(1f)); Icon(Icons.Default.MoreHoriz, null) }
                else {
                    Text(text = question, modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    IconButton(onClick = { expanded = !expanded }) { Icon(if (expanded) Icons.Default.Remove else Icons.Default.Add, null) }
                }
            }
            if (expanded && !isPlaceholder) { Text(text = answer, fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(top = 8.dp)) }
        }
    }
}

fun formatNotificationDate(isoString: String): String {
    return try {
        val input = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val output = SimpleDateFormat("yyyy/MM/dd", Locale.getDefault())
        val date = input.parse(isoString)
        if (date != null) output.format(date) else ""
    } catch (e: Exception) { "" }
}