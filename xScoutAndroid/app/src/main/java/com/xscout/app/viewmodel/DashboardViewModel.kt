package com.xscout.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xscout.app.data.model.DashboardStats
import com.xscout.app.data.model.StudentSession
import com.xscout.app.data.repository.XScoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val stats: DashboardStats = DashboardStats(),
    val recentSessions: List<StudentSession> = emptyList(),
    val activeSessions: List<StudentSession> = emptyList(),
    val isLoading: Boolean = true,
    val adminEmail: String = ""
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repository: XScoutRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState = _uiState.asStateFlow()

    init {
        _uiState.value = _uiState.value.copy(adminEmail = repository.getCurrentUserEmail())
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            repository.observeDashboardStats().collect { stats ->
                _uiState.value = _uiState.value.copy(stats = stats, isLoading = false)
            }
        }
        viewModelScope.launch {
            repository.observeActiveSessions().collect { sessions ->
                _uiState.value = _uiState.value.copy(activeSessions = sessions)
            }
        }
        viewModelScope.launch {
            repository.observeAllSessions().collect { sessions ->
                _uiState.value = _uiState.value.copy(
                    recentSessions = sessions.take(5),
                    isLoading = false
                )
            }
        }
    }

    fun signOut() = repository.signOut()
}
