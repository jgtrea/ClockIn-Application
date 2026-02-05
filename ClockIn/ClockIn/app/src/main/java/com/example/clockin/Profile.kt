package com.example.clockin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
    var isSaving by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        val profile = SupabaseManager.getCurrentUser()
        if (profile != null) {
            userProfile = profile
        } else {
            NotificationManager.show("Error", "User not found")
        }
        isLoading = false
    }

    fun saveField(newValue: String) {
        val profile = userProfile ?: return

        if (editField == "Name") {
            if (newValue.trim().isEmpty()) {
                NotificationManager.show(
                    header = "Validation Error",
                    message = "Name cannot be empty",
                    duration = 3000L
                )
                return
            }

            isSaving = true
            scope.launch {
                val result = SupabaseManager.updateUserName(profile.id, newValue.trim())

                isSaving = false
                showEditDialog = false

                if (result.isSuccess) {
                    // Update local state
                    userProfile = profile.copy(name = newValue.trim())

                    NotificationManager.show(
                        header = "Profile Updated",
                        message = "Your name has been updated successfully",
                        duration = 3000L
                    )
                } else {
                    val errorMsg = result.exceptionOrNull()?.message ?: "Unknown error occurred"
                    NotificationManager.show(
                        header = "Update Failed",
                        message = errorMsg,
                        duration = 4000L
                    )
                }
            }
        } else {
            showEditDialog = false
        }
    }

    if (showEditDialog) {
        EditFieldDialog(
            field = editField,
            currentValue = editValue,
            onDismiss = {
                if (!isSaving) {
                    showEditDialog = false
                }
            },
            onSave = { saveField(it) },
            isSaving = isSaving
        )
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
                    .background(Color(0xFFFF7F66))
                    .border(4.dp, Color.White, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = userProfile?.name?.firstOrNull()?.uppercase() ?: "",
                    color = Color.White,
                    fontSize = 64.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(12.dp))

            Text(text = userProfile?.name ?: "User", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(text = userProfile?.email ?: "", color = Color.Gray, fontSize = 16.sp)

            Spacer(modifier = Modifier.height(32.dp))

            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {

                ProfileEditItem("Name", userProfile?.name ?: "", isEditable = true) {
                    editField = "Name"
                    editValue = userProfile?.name ?: ""
                    showEditDialog = true
                }

                ProfileEditItem("Email", userProfile?.email ?: "", isEditable = false) {}

                ProfileEditItem("Employment", userProfile?.employment ?: "None", isEditable = false) {}
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
fun EditFieldDialog(
    field: String,
    currentValue: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit,
    isSaving: Boolean = false
) {
    var value by remember { mutableStateOf(currentValue) }

    Dialog(onDismissRequest = { if (!isSaving) onDismiss() }) {
        Surface(shape = RoundedCornerShape(16.dp), color = Color.White) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(text = "Edit $field", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = value,
                    onValueChange = { value = it },
                    label = { Text(field) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isSaving,
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(24.dp))

                if (isSaving) {
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            color = Color(0xFFFF7F66),
                            modifier = Modifier.size(40.dp)
                        )
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = onDismiss) {
                            Text("Cancel")
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = { onSave(value) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF7F66)),
                            enabled = value.trim().isNotEmpty() && value.trim() != currentValue.trim()
                        ) {
                            Text("Save")
                        }
                    }
                }
            }
        }
    }
}