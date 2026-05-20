package com.example.clockin

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
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
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.clockin.model.*
import com.example.clockin.viewmodel.MainViewModel
import io.github.jan.supabase.gotrue.handleDeeplinks
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

val BrownHeader = Color(0xFFAF8373)
val TextOrange = Color(0xFFFF725E)
val ButtonOrange = Color(0xFFFF725E)
val LightOrangeText = Color(0xFFE69A8D)
val BorderGray = Color(0xFFE0E0E0)

class MainActivity : ComponentActivity() {
    private var beaconService: BeaconService? = null
    private var isBound = false
    private val viewModel: MainViewModel by viewModels()

    private val connection =
        object : ServiceConnection {
            override fun onServiceConnected(
                className: ComponentName,
                service: IBinder,
            ) {
                val binder = service as BeaconService.LocalBinder
                beaconService = binder.getService()
                isBound = true

                beaconService?.onUpdate = { distance, found, _, statusMsg ->
                    viewModel.updateBeaconDistance(distance)
                    viewModel.setBeaconFound(found)
                    viewModel.setStatusMessage(statusMsg)
                }
            }

            override fun onServiceDisconnected(arg0: ComponentName) {
                isBound = false
                beaconService = null
            }
        }

    private fun startAndBindBeaconService() {
        try {
            if (!isBound) {
                Intent(this, BeaconService::class.java).also { intent ->
                    startService(intent)
                    bindService(intent, connection, Context.BIND_AUTO_CREATE)
                }
            }
        } catch (e: SecurityException) {
            Log.e("MainActivity", "SecurityException starting BeaconService: ${e.message}")
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to start BeaconService: ${e.message}")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        NotificationTracker.init(this)

        setContent {
            val navController = rememberNavController()
            val context = LocalContext.current
            val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current

            var isCheckingSession by remember { mutableStateOf(true) }
            var startDestination by remember { mutableStateOf("login") }

            val permissionsLauncher =
                rememberLauncherForActivityResult(
                    ActivityResultContracts.RequestMultiplePermissions(),
                ) { permissions ->
                    val allGranted = permissions.values.all { it }
                    if (!allGranted) {
                        NotificationManager.show(
                            header = "Permissions Required",
                            message = "Bluetooth and Location are needed for attendance.",
                        )
                    } else {
                        startAndBindBeaconService()
                    }
                }

            val enableBluetoothLauncher =
                rememberLauncherForActivityResult(
                    ActivityResultContracts.StartActivityForResult(),
                ) {}

            DisposableEffect(lifecycleOwner) {
                val observer =
                    LifecycleEventObserver { _, event ->
                        if (event == Lifecycle.Event.ON_RESUME) {
                            try {
                                val hasConnectPermission =
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                        ContextCompat.checkSelfPermission(
                                            context,
                                            Manifest.permission.BLUETOOTH_CONNECT,
                                        ) == PackageManager.PERMISSION_GRANTED
                                    } else {
                                        true
                                    }

                                if (hasConnectPermission) {
                                    val bluetoothManager = context.getSystemService(android.bluetooth.BluetoothManager::class.java)
                                    val bluetoothAdapter = bluetoothManager?.adapter
                                    if (bluetoothAdapter != null && !bluetoothAdapter.isEnabled) {
                                        val enableBtIntent =
                                            Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                                        enableBluetoothLauncher.launch(enableBtIntent)
                                    }
                                }
                            } catch (e: SecurityException) {
                                Log.e(
                                    "MainActivity",
                                    "Bluetooth permission denied, skipping BT check",
                                    e,
                                )
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        }
                    }
                lifecycleOwner.lifecycle.addObserver(observer)
                onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
            }

            LaunchedEffect(Unit) {
                val isResetLink = intent?.data?.host == "reset-callback"
                if (isResetLink) {
                    try {
                        SupabaseManager.client.handleDeeplinks(intent)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                val permissionsToRequest =
                    mutableListOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION,
                        Manifest.permission.FOREGROUND_SERVICE,
                    )

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    permissionsToRequest.add(Manifest.permission.BLUETOOTH_SCAN)
                    permissionsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
                }

                if (Build.VERSION.SDK_INT >= 34) {
                    permissionsToRequest.add("android.permission.FOREGROUND_SERVICE_LOCATION")
                }

                if (permissionsToRequest.any {
                        ContextCompat.checkSelfPermission(context, it) !=
                            PackageManager.PERMISSION_GRANTED
                    }
                ) {
                    permissionsLauncher.launch(permissionsToRequest.toTypedArray())
                } else {
                    startAndBindBeaconService()
                }

                // FIXED: Strictly enforce login state by fetching the user.
                SupabaseManager.loadSession()
                val currentUser = SupabaseManager.getCurrentUser()
                startDestination = if (currentUser != null) "home" else "login"
                isCheckingSession = false
            }

            val uiState by viewModel.uiState.collectAsState()

            LaunchedEffect(uiState.uiTargetBleName, uiState.uiTargetStartTime, uiState.activeAttendanceId) {
                val state = uiState
                if (state.uiTargetBleName.isNotEmpty() && isBound) {
                    val isClockedInNow = (state.activeAttendanceId != null)
                    beaconService?.startMonitoring(
                        state.uiTargetBleName,
                        state.uiTargetStartTime,
                        state.uiSchedId,
                        state.empId,
                        isClockedInNow,
                    )
                } else if (isBound) {
                    beaconService?.stopMonitoring()
                }
            }

            if (isCheckingSession) {
                Box(
                    modifier = Modifier.fillMaxSize().background(Color.White),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator(color = ButtonOrange) }
            } else {
                RealtimeNotificationListener()

                NotificationOverlay {
                    NavHost(navController = navController, startDestination = startDestination) {
                        composable("login") {
                            LoginScreen(
                                onLoginSuccess = {
                                    navController.navigate("home") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                },
                                onForgotPassword = { navController.navigate("forgotPassword") },
                                onNavigateToReset = { navController.navigate("resetPassword") },
                            )
                        }
                        composable("forgotPassword") {
                            ForgotPasswordScreen(
                                onBack = { navController.popBackStack() },
                                onNavigateToReset = { navController.navigate("resetPassword") },
                            )
                        }
                        composable("resetPassword") {
                            ResetPasswordScreen(
                                onNavigateToLogin = {
                                    navController.navigate("login") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                },
                            )
                        }
                        composable("home") {
                            val scope = rememberCoroutineScope()
                            DashboardScreen(
                                navController = navController,
                                beaconDistance = uiState.beaconDistance,
                                deviceName = uiState.uiTargetBleName,
                                statusMessage = uiState.statusMessage,
                                onActiveAttendanceIdChanged = { id ->
                                    viewModel.updateActiveAttendance(id)
                                },
                                onTargetBleChanged = { newBleName, newStartTime, schedId ->
                                    viewModel.setTargetBle(newBleName, newStartTime, schedId)
                                    scope.launch(Dispatchers.Main) {
                                        val user = SupabaseManager.getCurrentUser()
                                        if (user != null) viewModel.setEmpId(user.id)
                                        if (isBound) {
                                            val isClockedInNow = (uiState.activeAttendanceId != null)
                                            beaconService?.startMonitoring(
                                                newBleName,
                                                newStartTime,
                                                schedId,
                                                uiState.empId,
                                                isClockedInNow,
                                            )
                                        }
                                    }
                                },
                                isBeaconFound = uiState.isBeaconFound,
                                onLogout = {
                                    scope.launch(Dispatchers.Main) {
                                        if (isBound) beaconService?.stopMonitoring()
                                        SupabaseManager.signOut()
                                        navController.navigate("login") {
                                            popUpTo("home") { inclusive = true }
                                        }
                                    }
                                },
                                onProfileClick = { navController.navigate("profile") },
                            )
                        }
                        composable("profile") {
                            ProfileDetailsScreen(onBack = { navController.popBackStack() })
                        }
                        composable("scan_qr") {
                            ScannerScreen(
                                navController = navController,
                                isBeaconFound = uiState.isBeaconFound,
                            )
                        }
                        composable("schedule") { ScheduleScreen(navController = navController) }
                        composable("attendance") { AttendanceScreen(navController = navController) }
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isBound) {
            unbindService(connection)
            isBound = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onForgotPassword: () -> Unit,
    onNavigateToReset: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("AccountHistory", Context.MODE_PRIVATE) }

    var emailInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    var savedAccounts by remember { mutableStateOf(mapOf<String, String>()) }
    var expanded by remember { mutableStateOf(false) }

    var showDeviceConflict by remember { mutableStateOf(false) }
    var registeredDeviceInfo by remember { mutableStateOf("") }

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

    val filteredEmails = savedAccounts.keys.filter { it.contains(emailInput, ignoreCase = true) }

    Column(
        modifier =
            Modifier.fillMaxSize()
                .background(Color.White)
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                .imePadding(),
    ) {
        Box(
            modifier =
                Modifier.fillMaxWidth()
                    .height(240.dp)
                    .clip(RoundedCornerShape(bottomStart = 40.dp, bottomEnd = 40.dp))
                    .background(BrownHeader),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "CLOCK IN",
                style =
                    TextStyle(
                        fontSize = 42.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    ),
            )
        }

        Column(
            modifier = Modifier.padding(24.dp).navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                "Login to your Account",
                color = TextOrange,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                "Enter Credentials",
                color = LightOrangeText,
                modifier = Modifier.padding(vertical = 8.dp),
            )

            Card(
                modifier =
                    Modifier.fillMaxWidth()
                        .border(1.dp, BorderGray, RoundedCornerShape(8.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White),
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Column {
                        Text(
                            "Email",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.DarkGray,
                        )

                        ExposedDropdownMenuBox(
                            expanded = expanded && filteredEmails.isNotEmpty(),
                            onExpandedChange = {},
                        ) {
                            OutlinedTextField(
                                value = emailInput,
                                onValueChange = { emailInput = it },
                                placeholder = { Text("Enter Email") },
                                modifier = Modifier.fillMaxWidth().menuAnchor(),
                                keyboardOptions =
                                    KeyboardOptions(keyboardType = KeyboardType.Email),
                                shape = RoundedCornerShape(8.dp),
                                singleLine = true,
                                trailingIcon = {
                                    IconButton(onClick = { expanded = !expanded }) {
                                        ExposedDropdownMenuDefaults.TrailingIcon(
                                            expanded = expanded,
                                        )
                                    }
                                },
                                colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                            )

                            ExposedDropdownMenu(
                                expanded = expanded && filteredEmails.isNotEmpty(),
                                onDismissRequest = { expanded = false },
                            ) {
                                filteredEmails.forEach { email ->
                                    DropdownMenuItem(
                                        text = { Text(email) },
                                        onClick = {
                                            emailInput = email
                                            passwordInput = savedAccounts[email] ?: ""
                                            expanded = false
                                        },
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
                        isPassword = true,
                    )

                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.align(Alignment.CenterHorizontally),
                            color = ButtonOrange,
                        )
                    } else {
                        Button(
                            onClick = {
                                if (emailInput.isEmpty() || passwordInput.isEmpty()) {
                                    NotificationManager.show(
                                        "Input Error",
                                        "Please fill all fields",
                                    )
                                    return@Button
                                }
                                isLoading = true

                                scope.launch {
                                    val result =
                                        SupabaseManager.signInWithDeviceCheck(
                                            context,
                                            emailInput,
                                            passwordInput,
                                        )
                                    isLoading = false

                                    if (result.isSuccess) {
                                        NotificationManager.show("Success", "Login Successful")
                                        onLoginSuccess()
                                    } else {
                                        val errorMsg =
                                            result.exceptionOrNull()?.message
                                                ?: "Unknown Error"

                                        if (errorMsg.contains(
                                                "already registered on another device",
                                            )
                                        ) {
                                            registeredDeviceInfo =
                                                errorMsg.substringAfter("another device: ")
                                            showDeviceConflict = true
                                        } else {
                                            NotificationManager.show("Login Failed", errorMsg)
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ButtonOrange),
                            shape = RoundedCornerShape(8.dp),
                        ) { Text("Login", color = Color.White) }
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        TextButton(onClick = onForgotPassword, modifier = Modifier.fillMaxWidth()) {
                            Text(
                                "Forgot Password?",
                                color = ButtonOrange,
                                fontWeight = FontWeight.Medium,
                            )
                        }

                        TextButton(
                            onClick = onNavigateToReset,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                "Have a Code? Reset Password",
                                color = Color.Gray,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }
            }
        }
    }

    if (showDeviceConflict) {
        DeviceConflictDialog(
            registeredDevice = registeredDeviceInfo,
            currentDevice = "${Build.MANUFACTURER} ${Build.MODEL}",
            onDismiss = { showDeviceConflict = false },
        )
    }
}

@Composable
fun DeviceConflictDialog(
    registeredDevice: String,
    currentDevice: String,
    onDismiss: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            modifier = Modifier.fillMaxWidth().padding(16.dp),
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier =
                        Modifier.height(64.dp)
                            .fillMaxWidth()
                            .background(
                                Color(0xFFFF7F66).copy(alpha = 0.1f),
                                RoundedCornerShape(12.dp),
                            ),
                    contentAlignment = Alignment.Center,
                ) { Text("⚠", fontSize = 40.sp, color = Color(0xFFFF7F66)) }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    "Account Already Active",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    "This account is already registered on another device.",
                    fontSize = 14.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                )

                Spacer(modifier = Modifier.height(20.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Registered Device:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF4CAF50),
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            registeredDevice,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0)),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Current Device:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFF9800),
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            currentDevice,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    "To switch devices, please contact IT support.",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66)),
                    shape = RoundedCornerShape(12.dp),
                ) { Text("OK", modifier = Modifier.padding(vertical = 4.dp)) }
            }
        }
    }
}
