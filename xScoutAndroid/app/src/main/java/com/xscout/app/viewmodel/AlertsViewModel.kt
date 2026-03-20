package com.xscout.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xscout.app.data.model.Alert
import com.xscout.app.data.repository.XScoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AlertsUiState(
    val alerts: List<Alert> = emptyList(),
    val isLoading: Boolean = true
)

@HiltViewModel
class AlertsViewModel @Inject constructor(
    private val repository: XScoutRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AlertsUiState())
    val uiState = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            repository.observeAlerts().collect { alerts ->
                _uiState.value = AlertsUiState(alerts = alerts, isLoading = false)
            }
        }
    }

    fun markAsRead(alertId: String) {
        viewModelScope.launch {
            repository.markAlertRead(alertId)
        }
    }
}
