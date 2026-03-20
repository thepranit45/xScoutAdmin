package com.xscout.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xscout.app.data.model.StudentSession
import com.xscout.app.data.model.SuspicionLevel
import com.xscout.app.data.repository.XScoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SessionsUiState(
    val sessions: List<StudentSession> = emptyList(),
    val filteredSessions: List<StudentSession> = emptyList(),
    val isLoading: Boolean = true,
    val searchQuery: String = "",
    val filterLevel: SuspicionLevel? = null
)

@HiltViewModel
class SessionsViewModel @Inject constructor(
    private val repository: XScoutRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SessionsUiState())
    val uiState = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            repository.observeAllSessions().collect { sessions ->
                _uiState.value = _uiState.value.copy(
                    sessions = sessions,
                    isLoading = false
                )
                applyFilters()
            }
        }
    }

    fun onSearchChange(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        applyFilters()
    }

    fun onFilterChange(level: SuspicionLevel?) {
        _uiState.value = _uiState.value.copy(filterLevel = level)
        applyFilters()
    }

    private fun applyFilters() {
        val state = _uiState.value
        var result = state.sessions
        if (state.searchQuery.isNotBlank()) {
            result = result.filter {
                it.studentName.contains(state.searchQuery, ignoreCase = true) ||
                it.studentId.contains(state.searchQuery, ignoreCase = true) ||
                it.email.contains(state.searchQuery, ignoreCase = true)
            }
        }
        state.filterLevel?.let { level ->
            result = result.filter { it.suspicionLevel == level }
        }
        _uiState.value = state.copy(filteredSessions = result)
    }
}
