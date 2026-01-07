package com.example.clockin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FlashlightOn
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

import androidx.navigation.NavController
@Composable
fun ScannerScreen(navController: NavController) {
    Scaffold(
        bottomBar = { CustomBottomNavigation(navController, "scan_qr") } // Reusing your existing nav bar
    ) { paddingValues ->
        // Main container representing the camera view
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color.DarkGray) // Placeholder for Camera Feed
        ) {
            // 1. Top Instruction Text
            Text(
                text = "Find a QR code",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 60.dp)
            )

            // 2. Scanning Brackets (Frame)
            Box(
                modifier = Modifier
                    .size(280.dp)
                    .align(Alignment.Center)
            ) {
                // Top-Left Bracket
                ScannerBracket(Modifier.align(Alignment.TopStart), rotateX = false, rotateY = false)
                // Top-Right Bracket
                ScannerBracket(Modifier.align(Alignment.TopEnd), rotateX = true, rotateY = false)
                // Bottom-Left Bracket
                ScannerBracket(Modifier.align(Alignment.BottomStart), rotateX = false, rotateY = true)
                // Bottom-Right Bracket
                ScannerBracket(Modifier.align(Alignment.BottomEnd), rotateX = true, rotateY = true)
            }

            // 3. Floating Action Buttons (Flashlight & Gallery)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 80.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                ScannerActionButton(icon = Icons.Default.FlashlightOn)
                ScannerActionButton(icon = Icons.Default.Image)
            }
        }
    }
}

@Composable
fun ScannerBracket(modifier: Modifier, rotateX: Boolean, rotateY: Boolean) {
    // Custom bracket shape using borders and clipping
    Box(
        modifier = modifier
            .size(40.dp)
            .border(
                width = 4.dp,
                color = Color.White,
                shape = RoundedCornerShape(
                    topStart = if (!rotateX && !rotateY) 12.dp else 0.dp,
                    topEnd = if (rotateX && !rotateY) 12.dp else 0.dp,
                    bottomStart = if (!rotateX && rotateY) 12.dp else 0.dp,
                    bottomEnd = if (rotateX && rotateY) 12.dp else 0.dp
                )
            )
    )
}

@Composable
fun ScannerActionButton(icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Box(
        modifier = Modifier
            .size(70.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.3f)), // Semi-transparent grey circle
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(32.dp)
        )
    }
}