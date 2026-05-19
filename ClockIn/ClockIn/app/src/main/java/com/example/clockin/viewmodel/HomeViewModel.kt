package com.example.clockin.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.clockin.SupabaseManager
import com.example.clockin.model.NotificationItem
import com.example.clockin.model.Schedule
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class HomeUiState(
    val userName: String = "User",
    val notifications: List<NotificationItem> = emptyList(),
    val isLoadingNotifs: Boolean = true,
    val currentSectionTitle: String = "Checking Schedule...",
    val activeAttendanceId: String? = null,
    val isUpcomingClass: Boolean = false,
    val canClockInEarly: Boolean = false,
    val currentAttendanceStatus: String? = null
)

class HomeViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    fun updateSectionTitle(title: String) {
        _uiState.update { it.copy(currentSectionTitle = title) }
    }

    fun updateActiveAttendance(id: String?) {
        _uiState.update { it.copy(activeAttendanceId = id) }
    }

    fun updateAttendanceStatus(status: String?) {
        _uiState.update { it.copy(currentAttendanceStatus = status) }
    }

    fun updateUpcomingClass(isUpcoming: Boolean, canClockInEarly: Boolean) {
        _uiState.update { it.copy(isUpcomingClass = isUpcoming, canClockInEarly = canClockInEarly) }
    }

    fun refreshDashboard() {
        viewModelScope.launch(Dispatchers.IO) {
            val user = SupabaseManager.getCurrentUser()
            val userEmail = user?.email ?: ""
            _uiState.update { it.copy(userName = user?.name ?: "User") }

            // Fetch Notifications
            _uiState.update { it.copy(isLoadingNotifs = true) }
            try {
                val result = SupabaseManager.client.from("notification")
                    .select {
                        order("dataCreated", Order.DESCENDING)
                        limit(20)
                    }
                    .decodeList<NotificationItem>()

                val userNotifications = result.filter {
                    val targets = it.target?.split(",")?.map { t -> t.trim() } ?: emptyList()
                    targets.any { t -> t.equals("everyone", true) || t.equals(userEmail, true) }
                }

                // Full list shown in home page
                _uiState.update { it.copy(notifications = userNotifications) }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _uiState.update { it.copy(isLoadingNotifs = false) }
            }

            // The rest of the dashboard logic relies heavily on SupabaseManager context.
            // For Phase 1, we provide methods to update the state from the View if needed,
            // or we can gradually move logic here.
        }
    }

    fun startNotificationPolling() {
        viewModelScope.launch(Dispatchers.IO) {
            while (true) {
                delay(10_000L)
                if (SupabaseManager.isLoggedIn()) {
                    refreshDashboard()
                }
            }
        }
    }
}
