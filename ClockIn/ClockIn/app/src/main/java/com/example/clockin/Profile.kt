package com.example.clockin

import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import kotlinx.coroutines.launch

@Composable
fun ProfileDetailsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var userProfile by remember { mutableStateOf<UserProfile?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    var showEditDialog by remember { mutableStateOf(false) }
    var editField by remember { mutableStateOf("") }
    var editValue by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        val profile = FirebaseEmployeeManager.getCurrentUser()
        if (profile != null) {
            userProfile = profile
        } else {
            Toast.makeText(context, "User not found", Toast.LENGTH_SHORT).show()
        }
        isLoading = false
    }

    fun saveField(newValue: String) {
        val profile = userProfile ?: return

        val dbField = when (editField) {
            "Name" -> "name"
            "Employment" -> "employment"
            "Department" -> "department"
            "Employee ID" -> "employeeId"
            "Email" -> "email"
            else -> ""
        }

        if (dbField.isNotEmpty()) {
            scope.launch {
                val success = FirebaseEmployeeManager.updateUser(profile, dbField, newValue)
                if (success) {
                    userProfile = when (editField) {
                        "Name" -> profile.copy(name = newValue)
                        "Employment" -> profile.copy(employment = newValue)
                        "Department" -> profile.copy(department = newValue)
                        "Employee ID" -> profile.copy(employeeId = newValue)
                        "Email" -> profile.copy(email = newValue)
                        else -> profile
                    }
                    Toast.makeText(context, "Updated Successfully", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "Update Failed", Toast.LENGTH_SHORT).show()
                }
            }
        }
        showEditDialog = false
    }

    if (showEditDialog) {
        EditFieldDialog(editField, editValue, { showEditDialog = false }, { saveField(it) })
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

    val isEmployeeCollection = userProfile?.collectionName == "user_employee_data"

    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .background(Brush.verticalGradient(listOf(Color(0xFF5D6366), Color(0xFFFF7F66))))
        ) {
            Button(
                onClick = onBack,
                modifier = Modifier.align(Alignment.TopEnd).padding(top = 40.dp, end = 20.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66))
            ) { Text("Back") }
        }

        Column(
            modifier = Modifier.fillMaxWidth().offset(y = (-75).dp),
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

            Text(text = userProfile?.name ?: "User", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(text = userProfile?.email ?: "", color = Color.Gray, fontSize = 16.sp)

            if (!isEmployeeCollection) {
                Text("ADMINISTRATOR", color = Color(0xFFFF7F66), fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(top=4.dp))
            }

            Spacer(modifier = Modifier.height(32.dp))

            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {

                ProfileEditItem("Name", userProfile?.name ?: "", isEditable = true) {
                    editField = "Name"
                    editValue = userProfile?.name ?: ""
                    showEditDialog = true
                }

                ProfileEditItem("Email", userProfile?.email ?: "", isEditable = !isEmployeeCollection) {
                    editField = "Email"
                    editValue = userProfile?.email ?: ""
                    showEditDialog = true
                }

                if (isEmployeeCollection || userProfile?.employeeId!!.isNotEmpty()) {
                    ProfileEditItem("Employee ID", userProfile?.employeeId ?: "", isEditable = !isEmployeeCollection) {
                        editField = "Employee ID"
                        editValue = userProfile?.employeeId ?: ""
                        showEditDialog = true
                    }
                }

                ProfileEditItem("Department", userProfile?.department ?: "None", isEditable = !isEmployeeCollection) {
                    editField = "Department"
                    editValue = userProfile?.department ?: ""
                    showEditDialog = true
                }

                ProfileEditItem("Employment", userProfile?.employment ?: "", isEditable = !isEmployeeCollection) {
                    editField = "Employment"
                    editValue = userProfile?.employment ?: ""
                    showEditDialog = true
                }
            }
        }
    }
}

@Composable
fun ProfileEditItem(label: String, value: String, isEditable: Boolean = true, onEdit: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, modifier = Modifier.width(120.dp), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.DarkGray)
        Text(text = value, modifier = Modifier.weight(1f), fontSize = 14.sp, color = if (isEditable) Color.Black else Color.Gray)

        if (isEditable) {
            Icon(Icons.Default.Edit, "Edit", tint = Color(0xFFFF7F66), modifier = Modifier.size(20.dp).clickable { onEdit() })
        }
    }
}

@Composable
fun EditFieldDialog(field: String, currentValue: String, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var value by remember { mutableStateOf(currentValue) }
    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(16.dp), color = Color.White) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(text = "Edit $field", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(value = value, onValueChange = { value = it }, label = { Text(field) }, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(24.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel") }
                    Button(onClick = { onSave(value) }, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66))) { Text("Save") }
                }
            }
        }
    }
}