package com.xscout.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xscout.app.data.repository.AuthResult
import com.xscout.app.data.repository.XScoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val repository: XScoutRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.value = _uiState.value.copy(email = value, error = null)
    }

    fun onPasswordChange(value: String) {
        _uiState.value = _uiState.value.copy(password = value, error = null)
    }

    fun signIn() {
        val state = _uiState.value
        if (state.email.isBlank() || state.password.isBlank()) {
            _uiState.value = state.copy(error = "Please fill in all fields")
            return
        }
        viewModelScope.launch {
            _uiState.value = state.copy(isLoading = true, error = null)
            when (val result = repository.signIn(state.email.trim(), state.password)) {
                is AuthResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false, isSuccess = true
                )
                is AuthResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false, error = result.message
                )
            }
        }
    }

    fun isAlreadyLoggedIn(): Boolean = repository.isLoggedIn()
}
