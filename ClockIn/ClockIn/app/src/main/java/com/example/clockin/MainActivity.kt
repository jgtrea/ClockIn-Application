package com.example.clockin

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
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
import androidx.core.app.ActivityCompat
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import kotlinx.coroutines.launch
import kotlin.math.pow

val BrownHeader = Color(0xFFAF8373)
val TextOrange = Color(0xFFFF725E)
val ButtonOrange = Color(0xFFFF725E)
val LightOrangeText = Color(0xFFE69A8D)
val BorderGray = Color(0xFFE0E0E0)

class MainActivity : ComponentActivity() {
    var targetBleName by mutableStateOf("")
    private var currentScanCallback: ScanCallback? = null

    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothManager.adapter
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val navController = rememberNavController()
            val context = LocalContext.current
            val locationPermissionLauncher = rememberLauncherForActivityResult(
                ActivityResultContracts.RequestPermission()
            ) { isGranted ->
                if (!isGranted) {
                    Toast.makeText(context, "Permission needed to detect WiFi Name", Toast.LENGTH_LONG).show()
                }
            }

            LaunchedEffect(Unit) {
                if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                }
            }
            // ---------------------------------

            var beaconDistance by remember { mutableDoubleStateOf(0.0) }
            var isBeaconFound by remember { mutableStateOf(false) }

            LaunchedEffect(targetBleName) {
                if (targetBleName.isNotEmpty()) {
                    beaconDistance = 0.0
                    isBeaconFound = false

                    startScanning(targetBleName) { name, distance ->
                        beaconDistance = distance
                        isBeaconFound = true
                    }
                }
            }

            val startDestination = if (FirebaseEmployeeManager.isLoggedIn()) "home" else "login"

            NavHost(navController = navController, startDestination = startDestination) {
                composable("login") {
                    LoginScreen(onLoginSuccess = {
                        navController.navigate("home") {
                            popUpTo("login") { inclusive = true }
                        }
                    })
                }
                composable("home") {
                    DashboardScreen(
                        navController = navController,
                        beaconDistance = beaconDistance,
                        isBeaconFound = isBeaconFound,
                        deviceName = targetBleName,
                        onTargetBleChanged = { newBleName ->
                            targetBleName = newBleName
                            isBeaconFound = false
                        },
                        onLogout = {
                            FirebaseEmployeeManager.signOut()
                            navController.navigate("login") { popUpTo("home") { inclusive = true } }
                        },
                        onProfileClick = { navController.navigate("profile") }
                    )
                }
                composable("profile") {
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

    private fun startScanning(filterName: String, onUpdate: (String, Double) -> Unit) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return
        }

        val scanner = bluetoothAdapter?.bluetoothLeScanner ?: return

        currentScanCallback?.let {
            try {
                scanner.stopScan(it)
            } catch (e: Exception) {
                android.util.Log.e("BLE", "Error stopping scan: ${e.message}")
            }
        }

        val newCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                if (ActivityCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    return
                }

                val name = result.device.name
                if (name == filterName) {
                    val distance = calculateDistance(result.rssi, -59)
                    runOnUiThread { onUpdate(name ?: "Unknown", distance) }
                }
            }
        }

        currentScanCallback = newCallback

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        scanner.startScan(null, settings, newCallback)
    }

    private fun calculateDistance(rssi: Int, txPower: Int): Double {
        if (rssi == 0) return -1.0
        val n = 2.5
        return 10.0.pow((txPower.toDouble() - rssi) / (10 * n))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("AccountHistory", Context.MODE_PRIVATE) }

    var emailInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    var savedAccounts by remember { mutableStateOf(mapOf<String, String>()) }
    var expanded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        val rawString = prefs.getString("saved_accounts", "") ?: ""
        if (rawString.isNotEmpty()) {
            val map = mutableMapOf<String, String>()
            rawString.split(",").forEach { entry ->
                val parts = entry.split("|")
                if (parts.size == 2) {
                    map[parts[0]] = parts[1]
                }
            }
            savedAccounts = map
        }
    }

    val filteredEmails = savedAccounts.keys.filter {
        it.contains(emailInput, ignoreCase = true)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .imePadding()
    ) {
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

        Column(
            modifier = Modifier
                .padding(24.dp)
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(20.dp))
            Text("Login to your Account", color = TextOrange, fontSize = 26.sp, fontWeight = FontWeight.Bold)
            Text("Enter Credentials", color = LightOrangeText, modifier = Modifier.padding(vertical = 8.dp))

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderGray, RoundedCornerShape(8.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

                    Column {
                        Text("Email", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.DarkGray)
                        ExposedDropdownMenuBox(
                            expanded = expanded && filteredEmails.isNotEmpty(),
                            onExpandedChange = { expanded = !expanded }
                        ) {
                            OutlinedTextField(
                                value = emailInput,
                                onValueChange = {
                                    emailInput = it
                                    expanded = true
                                },
                                placeholder = { Text("Enter Email") },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                shape = RoundedCornerShape(8.dp),
                                singleLine = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                                colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors()
                            )

                            ExposedDropdownMenu(
                                expanded = expanded && filteredEmails.isNotEmpty(),
                                onDismissRequest = { expanded = false }
                            ) {
                                filteredEmails.forEach { email ->
                                    DropdownMenuItem(
                                        text = { Text(email) },
                                        onClick = {
                                            emailInput = email
                                            passwordInput = savedAccounts[email] ?: ""
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

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

                                scope.launch {
                                    val result = FirebaseEmployeeManager.signIn(emailInput, passwordInput)
                                    isLoading = false

                                    if (result.isSuccess) {
                                        val newMap = savedAccounts.toMutableMap()
                                        newMap[emailInput] = passwordInput
                                        val saveString = newMap.entries.joinToString(",") { "${it.key}|${it.value}" }
                                        prefs.edit().putString("saved_accounts", saveString).apply()

                                        Toast.makeText(context, "Login Successful", Toast.LENGTH_SHORT).show()
                                        onLoginSuccess()
                                    } else {
                                        Toast.makeText(context, "Login Failed: ${result.exceptionOrNull()?.message}", Toast.LENGTH_LONG).show()
                                    }
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