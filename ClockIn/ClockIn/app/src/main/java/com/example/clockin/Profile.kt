package com.example.clockin

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.* // This fixes remember and mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
@Composable
fun ProfileDetailsScreen(onBack: () -> Unit) {
    var isClicked by remember { mutableStateOf(false) }
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // 1. Gradient Header with Back Button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(Color(0xFF5D6366), Color(0xFFFF7F66))
                        )
                    )
            ) {
                Button(
                    onClick = {
                        // 2. Check if already clicked; if not, navigate and lock
                        if (!isClicked) {
                            isClicked = true
                            onBack()
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = 40.dp, end = 20.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Back", color = Color.White)
                }
            }

            // 2. Overlapping Profile Picture
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = (-75).dp), // Moves the profile up into the header area
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(150.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFE0E0E0))
                        .border(4.dp, Color.White, CircleShape)
                )

                Spacer(modifier = Modifier.height(12.dp))
                Text("Luis Gerard Tiongco", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Text("tiongco@gmail.com", color = Color.Gray, fontSize = 16.sp)

                Spacer(modifier = Modifier.height(32.dp))

                // 3. Editable Information List
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    ProfileEditItem(label = "Username", value = "Luis Gerard Tiongco")
                    ProfileEditItem(label = "Email", value = "tiongco@gmail.com")
                    ProfileEditItem(label = "Password", value = "**************")
                    ProfileEditItem(label = "Organization", value = "Add organization", isPlaceholder = true)
                    ProfileEditItem(label = "Department", value = "Add department", isPlaceholder = true)
                }
            }
        }
    }

@Composable
fun ProfileEditItem(label: String, value: String, isPlaceholder: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            modifier = Modifier.width(120.dp),
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp
        )
        Text(
            text = value,
            modifier = Modifier.weight(1f),
            color = if (isPlaceholder) Color.LightGray else Color.Black,
            fontSize = 14.sp
        )
        Icon(
            imageVector = Icons.Default.Edit,
            contentDescription = "Edit",
            modifier = Modifier.size(20.dp).clickable { /* Handle edit */ },
            tint = Color.Black
        )
    }
}