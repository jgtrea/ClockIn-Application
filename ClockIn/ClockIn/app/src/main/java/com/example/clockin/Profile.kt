package com.example.clockin

import android.util.Log
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ProfileDetailsScreen(onBack: () -> Unit) {
    var isClicked by remember { mutableStateOf(false) }
    var employeeData by remember { mutableStateOf<Employee?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var showEditDialog by remember { mutableStateOf(false) }
    var editField by remember { mutableStateOf("") }
    var editValue by remember { mutableStateOf("") }
    var debugInfo by remember { mutableStateOf("") }

    val auth = FirebaseAuth.getInstance()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val currentUserId = auth.currentUser?.uid
        val currentEmail = auth.currentUser?.email

        // This sets the debug info you see in the red error screen
        debugInfo = "User ID: ${currentUserId ?: "NULL"}\nEmail: ${currentEmail ?: "NULL"}"

        if (currentUserId == null) {
            isLoading = false
            return@LaunchedEffect
        }

        // Fetch data if user exists
        val employee = withContext(Dispatchers.IO) {
            FirebaseEmployeeManager.getCurrentEmployee()
        }

        employeeData = employee
        isLoading = false
    }

    // Edit Dialog
    if (showEditDialog) {
        EditFieldDialog(
            field = editField,
            currentValue = editValue,
            onDismiss = { showEditDialog = false },
            onSave = { newValue ->
                employeeData?.let { current ->
                    val updated = when (editField) {
                        "Name" -> current.copy(name = newValue)
                        "Email" -> current.copy(email = newValue)
                        "Employee ID" -> current.copy(employeeId = newValue)
                        "Department" -> current.copy(department = newValue)
                        "Employment" -> current.copy(employment = newValue)
                        else -> current
                    }
                    scope.launch(Dispatchers.IO) {
                        if (FirebaseEmployeeManager.updateEmployee(updated)) {
                            withContext(Dispatchers.Main) { employeeData = updated }
                        }
                    }
                }
                showEditDialog = false
            }
        )
    }

    // Loading State
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFFFF7F66))
        }
        return
    }

    // Error State (Triggered if User is NULL)
    if (employeeData == null) {
        Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "Account Not Synced",
                    color = Color.Red,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(16.dp))

                Text("Debug Info:", fontWeight = FontWeight.Bold, fontSize = 14.sp)

                // This box shows the NULL values
                Text(
                    debugInfo,
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.background(Color(0xFFF0F0F0)).padding(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    "Ensure you are logged in and your Firestore Document ID matches the User ID above.",
                    textAlign = TextAlign.Center,
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = onBack,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66))
                ) {
                    Text("Go Back")
                }
            }
        }
        return
    }

    // Success State
    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .background(Brush.verticalGradient(listOf(Color(0xFF5D6366), Color(0xFFFF7F66))))
        ) {
            Button(
                onClick = {
                    if (!isClicked) {
                        isClicked = true
                        onBack()
                    }
                },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 40.dp, end = 20.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66))
            ) {
                Text("Back")
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = (-75).dp),
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

            Text(text = employeeData?.name ?: "User", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(text = employeeData?.email ?: "", color = Color.Gray, fontSize = 16.sp)
            Text(
                text = "ID: ${employeeData?.employeeId ?: ""}",
                color = Color(0xFFFF7F66),
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(32.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                ProfileEditItem("Name", employeeData?.name ?: "") {
                    editField = "Name"
                    editValue = employeeData?.name ?: ""
                    showEditDialog = true
                }
                ProfileEditItem("Email", employeeData?.email ?: "") {
                    editField = "Email"
                    editValue = employeeData?.email ?: ""
                    showEditDialog = true
                }
                ProfileEditItem("Employee ID", employeeData?.employeeId ?: "") {
                    editField = "Employee ID"
                    editValue = employeeData?.employeeId ?: ""
                    showEditDialog = true
                }
                ProfileEditItem("Department", employeeData?.department ?: "Add info") {
                    editField = "Department"
                    editValue = employeeData?.department ?: ""
                    showEditDialog = true
                }
            }
        }
    }
}

@Composable
fun ProfileEditItem(label: String, value: String, onEdit: () -> Unit) {
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
            fontSize = 14.sp
        )
        Icon(
            Icons.Default.Edit,
            "Edit",
            modifier = Modifier
                .size(20.dp)
                .clickable { onEdit() }
        )
    }
}

@Composable
fun EditFieldDialog(
    field: String,
    currentValue: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var value by remember { mutableStateOf(currentValue) }
    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(16.dp), color = Color.White) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(text = "Edit $field", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = value,
                    onValueChange = { value = it },
                    label = { Text(field) },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(24.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel") }
                    Button(
                        onClick = { onSave(value) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66))
                    ) {
                        Text("Save")
                    }
                }
            }
        }
    }
}