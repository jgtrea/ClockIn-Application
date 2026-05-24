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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.clockin.model.*

@Composable
fun ProfileDetailsScreen(onBack: () -> Unit) {
    val context = LocalContext.current

    var userProfile by remember { mutableStateOf<UserProfile?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val profile = SupabaseManager.getCurrentUser()
        if (profile != null) {
            userProfile = profile
        } else {
            NotificationManager.show("Error", "User not found")
        }
        isLoading = false
    }

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFFFF7F66))
        }
        return
    }

    if (userProfile == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Profile could not be loaded.")
            Button(onClick = onBack, modifier = Modifier.padding(top = 16.dp)) { Text("Back") }
        }
        return
    }

    Column(modifier = Modifier.fillMaxSize().background(androidx.compose.material3.MaterialTheme.colorScheme.background).verticalScroll(rememberScrollState())) {
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .background(Brush.verticalGradient(listOf(Color(0xFF5D6366), Color(0xFFFF7F66)))),
        ) {
            Button(
                onClick = onBack,
                modifier = Modifier.align(Alignment.TopEnd).padding(top = 40.dp, end = 20.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66)),
            ) { Text("Back") }
        }

        Column(
            modifier = Modifier.fillMaxWidth().offset(y = (-75).dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier =
                    Modifier
                        .size(150.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFFF7F66))
                        .border(4.dp, androidx.compose.material3.MaterialTheme.colorScheme.surface, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = userProfile?.name?.firstOrNull()?.uppercase() ?: "",
                    color = Color.White,
                    fontSize = 64.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(modifier = Modifier.height(12.dp))

            Text(text = userProfile?.name ?: "User", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = androidx.compose.material3.MaterialTheme.colorScheme.onBackground)
            Text(text = userProfile?.email ?: "", color = androidx.compose.material3.MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f), fontSize = 16.sp)

            Spacer(modifier = Modifier.height(32.dp))

            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                ProfileInfoItem("Name", userProfile?.name ?: "")

                ProfileInfoItem("Email", userProfile?.email ?: "")

                ProfileInfoItem("Employment", userProfile?.employment ?: "None")
            }
        }
    }
}

@Composable
fun ProfileInfoItem(
    label: String,
    value: String,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = label, modifier = Modifier.width(120.dp), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = androidx.compose.material3.MaterialTheme.colorScheme.onBackground)
        Text(text = value, modifier = Modifier.weight(1f), fontSize = 14.sp, color = androidx.compose.material3.MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
    }
}
