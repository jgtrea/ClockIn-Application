package com.example.clockin.viewmodel

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class MainUiState(
    val beaconDistance: Double = -1.0,
    val isBeaconFound: Boolean = false,
    val statusMessage: String = "Scanning...",
    val uiTargetBleName: String = "",
    val uiTargetStartTime: Long = 0L,
    val uiTargetEndTime: Long = 0L,
    val uiSchedId: String = "",
    val empId: String = "",
    val activeAttendanceId: String? = null,
)

class MainViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    fun updateBeaconDistance(distance: Double) {
        _uiState.update { it.copy(beaconDistance = distance) }
    }

    fun setBeaconFound(found: Boolean) {
        _uiState.update { it.copy(isBeaconFound = found) }
    }

    fun setStatusMessage(message: String) {
        _uiState.update { it.copy(statusMessage = message) }
    }

    fun setEmpId(id: String) {
        _uiState.update { it.copy(empId = id) }
    }

    fun updateActiveAttendance(id: String?) {
        _uiState.update { it.copy(activeAttendanceId = id) }
    }

    fun setTargetBle(
        name: String,
        startTime: Long,
        endTime: Long,
        schedId: String,
    ) {
        _uiState.update {
            it.copy(
                uiTargetBleName = name,
                uiTargetStartTime = startTime,
                uiTargetEndTime = endTime,
                uiSchedId = schedId,
            )
        }
    }

}
