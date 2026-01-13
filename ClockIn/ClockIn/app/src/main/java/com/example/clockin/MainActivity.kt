package com.example.clockin

import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.google.firebase.firestore.FirebaseFirestore
import java.util.Date

// --- Shared Colors ---
val BrownHeader = Color(0xFFAF8373)
val TextOrange = Color(0xFFFF725E)
val ButtonOrange = Color(0xFFFF725E)
val LightOrangeText = Color(0xFFE69A8D)
val BorderGray = Color(0xFFE0E0E0)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // --- CONNECTION TEST ---
        // This runs automatically to verify Firestore is reachable.
        val db = FirebaseFirestore.getInstance()
        val testData = hashMapOf(
            "status" to "Connection Successful",
            "timestamp" to Date(),
            "mode" to "Simple Login"
        )
        setContent {
            val navController = rememberNavController()

            NavHost(navController = navController, startDestination = "login") {
                composable("login") {
                    LoginScreen(onLoginSuccess = {
                        navController.navigate("home") {
                            popUpTo("login") { inclusive = true }
                        }
                    })
                }

                // --- NAVIGATION DESTINATIONS ---
                // Make sure you have these Composable functions in your other files!
                composable("home") {
                    // Replace this with your actual DashboardScreen call
                    DashboardScreen(
                        navController = navController,
                        onLogout = {
                            navController.navigate("login") { popUpTo("home") { inclusive = true } }
                        },
                        onProfileClick = { navController.navigate("profile") }
                    )
                }
                composable("profile") {
                    // Replace with your ProfileDetailsScreen
                    ProfileDetailsScreen(onBack = { navController.popBackStack() })
                }
                composable("scan_qr") {
                    ScannerScreen(navController = navController)
                }
                composable("schedule") {
                    ScheduleScreen(navController = navController)
                }
                composable("attendance") {
                    AttendanceScreen(navController = navController)
                }
            }
        }
    }
}

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    val context = LocalContext.current
    val db = FirebaseFirestore.getInstance()

    var emailInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .imePadding()
    ) {
        // Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(240.dp)
                .clip(RoundedCornerShape(bottomStart = 40.dp, bottomEnd = 40.dp))
                .background(BrownHeader),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "CLOCK IN",
                style = TextStyle(fontSize = 42.sp, fontWeight = FontWeight.Bold, color = Color.White)
            )
        }

        // Login Form
        Column(
            modifier = Modifier
                .padding(24.dp)
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(20.dp))
            Text("Login to your Account", color = TextOrange, fontSize = 26.sp, fontWeight = FontWeight.Bold)
            Text("Simple Database Login", color = LightOrangeText, modifier = Modifier.padding(vertical = 8.dp))

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderGray, RoundedCornerShape(8.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

                    LabeledInput(
                        label = "Email",
                        placeholder = "Enter Email",
                        value = emailInput,
                        onValueChange = { emailInput = it }
                    )

                    LabeledInput(
                        label = "Password",
                        placeholder = "Enter Password",
                        value = passwordInput,
                        onValueChange = { passwordInput = it },
                        isPassword = true
                    )

                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.align(Alignment.CenterHorizontally),
                            color = ButtonOrange
                        )
                    } else {
                        Button(
                            onClick = {
                                if (emailInput.isEmpty() || passwordInput.isEmpty()) {
                                    Toast.makeText(context, "Please fill all fields", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }

                                isLoading = true

                                // --- LOGIC: CHECK ADMIN COLLECTION ---
                                db.collection("user_admin_data")
                                    .whereEqualTo("email", emailInput)
                                    .whereEqualTo("pass", passwordInput) // Matching password directly
                                    .get()
                                    .addOnSuccessListener { adminDocs ->
                                        if (!adminDocs.isEmpty) {
                                            isLoading = false
                                            Toast.makeText(context, "Welcome Admin!", Toast.LENGTH_SHORT).show()
                                            onLoginSuccess()
                                        } else {
                                            // --- LOGIC: CHECK EMPLOYEE COLLECTION ---
                                            db.collection("user_employee_data")
                                                .whereEqualTo("email", emailInput)
                                                .whereEqualTo("pass", passwordInput)
                                                .get()
                                                .addOnSuccessListener { empDocs ->
                                                    isLoading = false
                                                    if (!empDocs.isEmpty) {
                                                        Toast.makeText(context, "Welcome Employee!", Toast.LENGTH_SHORT).show()
                                                        onLoginSuccess()
                                                    } else {
                                                        Toast.makeText(context, "Invalid Email or Password", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                                .addOnFailureListener { e ->
                                                    isLoading = false
                                                    Toast.makeText(context, "Error checking employee: ${e.message}", Toast.LENGTH_SHORT).show()
                                                }
                                        }
                                    }
                                    .addOnFailureListener { e ->
                                        isLoading = false
                                        Toast.makeText(context, "Error checking admin: ${e.message}", Toast.LENGTH_SHORT).show()
                                    }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ButtonOrange),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Login", color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LabeledInput(
    label: String,
    placeholder: String,
    value: String,
    onValueChange: (String) -> Unit,
    isPassword: Boolean = false
) {
    Column {
        Text(label, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.DarkGray)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder) },
            modifier = Modifier.fillMaxWidth(),
            visualTransformation = if (isPassword) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
            keyboardOptions = KeyboardOptions(
                keyboardType = if (isPassword) KeyboardType.Password else KeyboardType.Email
            ),
            shape = RoundedCornerShape(8.dp),
            singleLine = true
        )
    }
}