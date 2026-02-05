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
fun ForgotPasswordScreen(onBack: () -> Unit, onNavigateToReset: () -> Unit) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var emailSent by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).statusBarsPadding().verticalScroll(rememberScrollState()).imePadding()
    ) {
        Box(
            modifier = Modifier.fillMaxWidth().height(240.dp).clip(RoundedCornerShape(bottomStart = 40.dp, bottomEnd = 40.dp)).background(BrownHeader)
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.align(Alignment.TopStart).padding(16.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Column(modifier = Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = "GET CODE", style = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color.White))
            }
        }

        Column(modifier = Modifier.padding(24.dp).navigationBarsPadding(), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(modifier = Modifier.height(20.dp))

            if (emailSent) {
                SuccessCard(
                    title = "Code Sent",
                    message = "We sent a 6-digit code to $email. Please enter it on the next screen.",
                    buttonText = "Proceed to Reset",
                    onButtonClick = {
                        onNavigateToReset()
                    }
                )
            } else {
                Text("Request OTP Code", color = TextOrange, fontSize = 26.sp, fontWeight = FontWeight.Bold)
                Text("Enter your email to receive a login code.", color = LightOrangeText, modifier = Modifier.padding(vertical = 8.dp), textAlign = TextAlign.Center)

                Card(
                    modifier = Modifier.fillMaxWidth().border(1.dp, BorderGray, RoundedCornerShape(8.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        LabeledInput(label = "Email Address", placeholder = "Enter your email", value = email, onValueChange = { email = it; errorMessage = null })

                        errorMessage?.let { Text(text = it, color = Color.Red, fontSize = 12.sp) }

                        if (isLoading) {
                            CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally), color = ButtonOrange)
                        } else {
                            Button(
                                onClick = {
                                    if (email.isEmpty()) { errorMessage = "Please enter email"; return@Button }
                                    isLoading = true
                                    errorMessage = null
                                    scope.launch {
                                        val result = SupabaseManager.sendOTP(email)
                                        isLoading = false
                                        if (result.isSuccess) {
                                            emailSent = true
                                        } else {
                                            errorMessage = result.exceptionOrNull()?.message ?: "Failed to send code"
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = ButtonOrange),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Send Code", color = Color.White)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = onBack, colors = ButtonDefaults.textButtonColors(), modifier = Modifier.padding(top = 4.dp)) {
                    Text("Back to Login", color = ButtonOrange, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}