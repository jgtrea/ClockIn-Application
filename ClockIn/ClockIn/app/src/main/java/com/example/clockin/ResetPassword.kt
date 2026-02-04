package com.example.clockin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

@Composable
fun ResetPasswordScreen(onNavigateToLogin: () -> Unit) {
    val scope = rememberCoroutineScope()
    // New Fields for manual bypass
    var email by remember { mutableStateOf("") }
    var otpToken by remember { mutableStateOf("") }

    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).statusBarsPadding().verticalScroll(rememberScrollState()).imePadding()
    ) {
        Box(
            modifier = Modifier.fillMaxWidth().height(240.dp).clip(RoundedCornerShape(bottomStart = 40.dp, bottomEnd = 40.dp)).background(BrownHeader)
        ) {
            IconButton(onClick = onNavigateToLogin, modifier = Modifier.align(Alignment.TopStart).padding(16.dp)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Column(modifier = Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = "RESET WITH CODE", style = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color.White))
            }
        }

        Column(modifier = Modifier.padding(24.dp).navigationBarsPadding(), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(modifier = Modifier.height(20.dp))

            if (successMessage != null) {
                SuccessCard(title = "Success", message = successMessage!!, buttonText = "Go to Login", onButtonClick = onNavigateToLogin)
            } else {
                Text("Enter Details", color = TextOrange, fontSize = 26.sp, fontWeight = FontWeight.Bold)
                Text("Enter the code from your email and your new password.", color = LightOrangeText, modifier = Modifier.padding(vertical = 8.dp), textAlign = TextAlign.Center)

                Card(modifier = Modifier.fillMaxWidth().border(1.dp, BorderGray, RoundedCornerShape(8.dp)), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

                        // --- BYPASS FIELDS ---
                        LabeledInput(label = "Email Address", placeholder = "Enter your email", value = email, onValueChange = { email = it })
                        LabeledInput(label = "6-Digit Code", placeholder = "Enter OTP Code", value = otpToken, onValueChange = { otpToken = it })
                        // ---------------------

                        LabeledInput(label = "New Password", placeholder = "Enter new password", value = newPassword, onValueChange = { newPassword = it }, isPassword = true)
                        LabeledInput(label = "Confirm Password", placeholder = "Confirm new password", value = confirmPassword, onValueChange = { confirmPassword = it }, isPassword = true)

                        errorMessage?.let { Text(text = it, color = Color.Red, fontSize = 12.sp) }

                        if (isLoading) {
                            CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally), color = ButtonOrange)
                        } else {
                            Button(
                                onClick = {
                                    if (email.isEmpty() || otpToken.isEmpty() || newPassword.isEmpty()) { errorMessage = "Please fill all fields"; return@Button }
                                    if (newPassword != confirmPassword) { errorMessage = "Passwords do not match"; return@Button }

                                    isLoading = true
                                    errorMessage = null
                                    scope.launch {
                                        val loginResult = SupabaseManager.verifyOTP(email, otpToken)
                                        if (loginResult.isSuccess) {
                                            val updateResult = SupabaseManager.updateUserPassword(newPassword)
                                            if (updateResult.isSuccess) {
                                                SupabaseManager.signOut()
                                                successMessage = "Password updated successfully!"
                                            } else {
                                                errorMessage = updateResult.exceptionOrNull()?.message
                                            }
                                        } else {
                                            errorMessage = "Invalid Code or Email: ${loginResult.exceptionOrNull()?.message}"
                                        }
                                        isLoading = false
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = ButtonOrange),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Reset Password", color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}