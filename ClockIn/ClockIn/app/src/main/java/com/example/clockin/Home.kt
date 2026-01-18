package com.example.clockin

import androidx.compose.runtime.*
import androidx.compose.foundation.clickable
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.outlined.*
import androidx.navigation.NavController
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.*
import com.google.firebase.auth.FirebaseAuth

val PrimaryOrange = Color(0xFFFF7F66)

@Composable
fun DashboardScreen(navController: NavController, onLogout: () -> Unit, onProfileClick: () -> Unit) {
    var showPolicies by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showFAQ by remember { mutableStateOf(false) }

    if (showFeedbackDialog) {
        FeedbackDialog(onDismiss = { showFeedbackDialog = false })
    }

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
                onProfileClick = { navController.navigate("profile") },
                onLogout = onLogout,
                onPoliciesClick = { showPolicies = true },
                onFAQClick = { showFAQ = true },
                onSendFeedbackClick = { showFeedbackDialog = true }
            )

            HorizontalDivider(thickness = 1.dp, color = Color.LightGray)

            when {
                showPolicies -> PoliciesView(onBack = { showPolicies = false })
                showFAQ -> FAQView(onBack = { showFAQ = false })
                else -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp)
                    ) {
                        SectionHeader(title = "Notifications", icon = Icons.Default.NotificationsNone)
                        InfoCard(
                            title = "Update 2025/11/10:",
                            text = "Fixed several issues to improve attendance tracking and system performance."
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        InfoCard(
                            title = "Upcoming Schedule:",
                            text = "Math | R001 | Mon 8:00-9:30"
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun UserMenuHeader() {
    val userEmail = FirebaseAuth.getInstance().currentUser?.email
    var userName by remember { mutableStateOf("Loading...") }

    LaunchedEffect(Unit) {
        val userProfile = FirebaseEmployeeManager.getCurrentUser()
        userName = userProfile?.name ?: "Guest User"
    }

    Row(
        modifier = Modifier.padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.size(40.dp).clip(CircleShape).background(Color.LightGray))
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(userName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(userEmail ?: "No active session", color = Color.Gray, fontSize = 10.sp)
        }
    }
}

@Composable
fun DashboardHeader(
    onProfileClick: () -> Unit,
    onLogout: () -> Unit,
    onSendFeedbackClick: () -> Unit,
    onPoliciesClick: () -> Unit,
    onFAQClick: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            SearchField(label = "Search", isHighlighted = false)
        }

        Spacer(modifier = Modifier.width(16.dp))

        Box {
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(CircleShape)
                    .background(Color.LightGray)
                    .clickable { expanded = true }
            )

            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier.background(Color.White).width(240.dp)
            ) {
                UserMenuHeader()
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                MenuActionItem(Icons.Outlined.Person, "Profile") {
                    expanded = false
                    onProfileClick()
                }
                MenuActionItem(Icons.AutoMirrored.Outlined.Assignment, "Send Feedback") {
                    expanded = false
                    onSendFeedbackClick()
                }
                MenuActionItem(Icons.Outlined.Inventory, "Policies") {
                    expanded = false
                    onPoliciesClick()
                }
                MenuActionItem(Icons.AutoMirrored.Outlined.HelpOutline, "Help") {
                    expanded = false
                    onFAQClick()
                }
                MenuActionItem(Icons.AutoMirrored.Outlined.Logout, "Logout") {
                    expanded = false
                    onLogout()
                }
            }
        }
    }
}


@Composable
fun CustomBottomNavigation(navController: NavController, currentRoute: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        shadowElevation = 8.dp,
        color = Color.White
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            SelectableNavItem(Icons.Default.Home, "Home", currentRoute == "home") {
                if (currentRoute != "home") {
                    navController.navigate("home") {
                        popUpTo("home") { saveState = true }
                        launchSingleTop = true
                    }
                }
            }
            SelectableNavItem(Icons.Default.CropFree, "Scan QR", currentRoute == "scan_qr") {
                if (currentRoute != "scan_qr") navController.navigate("scan_qr")
            }
            SelectableNavItem(Icons.Default.DateRange, "Schedule", currentRoute == "schedule") {
                if (currentRoute != "schedule") navController.navigate("schedule")
            }
            SelectableNavItem(Icons.Default.Schedule, "Attendance", currentRoute == "attendance") {
                if (currentRoute != "attendance") navController.navigate("attendance")
            }
        }
    }
}

@Composable
fun SelectableNavItem(icon: ImageVector, label: String, isSelected: Boolean, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (isSelected) PrimaryOrange else Color.Transparent)
            .clickable { onClick() }
            .padding(horizontal = 20.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(icon, contentDescription = null, tint = if (isSelected) Color.White else Color.Black)
        Text(text = label, color = if (isSelected) Color.White else Color.Black, fontSize = 12.sp)
    }
}

@Composable
fun MenuActionItem(icon: ImageVector, label: String, onClick: () -> Unit) {
    DropdownMenuItem(
        text = { Text(label, fontWeight = FontWeight.Medium) },
        leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp)) },
        onClick = onClick
    )
}

@Composable
fun SearchField(label: String, isHighlighted: Boolean) {
    val borderColor = if (isHighlighted) PrimaryOrange else Color.LightGray
    Row(
        modifier = Modifier.fillMaxWidth().border(1.5.dp, borderColor, RoundedCornerShape(12.dp)).padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = label, color = Color.Gray, fontSize = 16.sp)
    }
}

@Composable
fun SectionHeader(title: String, icon: ImageVector) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = title, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Icon(icon, contentDescription = null)
    }
    HorizontalDivider(modifier = Modifier.padding(top = 8.dp, bottom = 16.dp), thickness = 1.dp, color = Color.Black)
}

@Composable
fun InfoCard(title: String? = null, text: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder()
    ) {
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
fun FeedbackDialog(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(24.dp), color = Color.White, modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Submit Feedback", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                    IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Close") }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text("Title", color = Color.Gray, fontSize = 14.sp)
                Box(modifier = Modifier.fillMaxWidth().height(45.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFFF2F2F2)))
                Spacer(modifier = Modifier.height(16.dp))
                Text("Description", color = Color.Gray, fontSize = 14.sp)
                Box(modifier = Modifier.fillMaxWidth().height(150.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFFF2F2F2)))
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = { onDismiss() },
                    modifier = Modifier.align(Alignment.End),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text("Submit", color = Color.White)
                }
            }
        }
    }
}

@Composable
fun PoliciesView(onBack: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Button(
            onClick = onBack,
            modifier = Modifier.align(Alignment.End),
            colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("Back", color = Color.White)
        }
        Spacer(modifier = Modifier.height(24.dp))
        Text("Privacy Statement", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Text(
            "We value your privacy and all personal information collected securely.",
            fontSize = 12.sp,
            color = Color.Gray,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 32.dp, vertical = 8.dp)
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text("Data Privacy Policy Statement", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "The Data Privacy Act of 2012 (Republic Act No. 10173) upholds the fundamental right to privacy...",
            fontSize = 13.sp,
            textAlign = TextAlign.Justify,
            lineHeight = 18.sp
        )
    }
}

@Composable
fun FAQView(onBack: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Button(
            onClick = onBack,
            modifier = Modifier.align(Alignment.End),
            colors = ButtonDefaults.buttonColors(containerColor = PrimaryOrange),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("Back", color = Color.White)
        }
        Spacer(modifier = Modifier.height(24.dp))
        Text("Frequently asked Questions", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(24.dp))
        FAQItem(
            question = "How does the system work?",
            answer = "The system tracks your clock-in and clock-out times via QR code scanning."
        )
        FAQItem(
            question = "Can it detect late log-outs?",
            answer = "The system automatically records the exact time of each scan.",
            initialExpanded = true
        )
    }
}

@Composable
fun FAQItem(question: String, answer: String, initialExpanded: Boolean = false, isPlaceholder: Boolean = false) {
    var expanded by remember { mutableStateOf(initialExpanded) }
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE0E0E0))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (isPlaceholder) {
                    Spacer(modifier = Modifier.weight(1f))
                    Icon(Icons.Default.MoreHoriz, null)
                } else {
                    Text(
                        text = question,
                        modifier = Modifier.weight(1f),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                    IconButton(onClick = { expanded = !expanded }) {
                        Icon(if (expanded) Icons.Default.Remove else Icons.Default.Add, null)
                    }
                }
            }
            if (expanded && !isPlaceholder) {
                Text(
                    text = answer,
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}