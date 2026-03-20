package com.xscout.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xscout.app.data.repository.XScoutRepository
import com.xscout.app.ui.components.WarpTextField
import com.xscout.app.ui.components.WarpBackground
import com.xscout.app.ui.theme.XScoutColors
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AddStudentViewModel @Inject constructor(
    private val repository: XScoutRepository
) : ViewModel() {
    private val _isSaving = MutableStateFlow(false)
    val isSaving = _isSaving.asStateFlow()

    private val _msg = MutableStateFlow<String?>(null)
    val msg = _msg.asStateFlow()

    fun addStudent(id: String, name: String, notes: String, onDone: () -> Unit) {
        if (id.isBlank() || name.isBlank()) {
            _msg.value = "ID and Name are required"
            return
        }
        viewModelScope.launch {
            _isSaving.value = true
            val success = repository.addAuthorizedStudent(id, name, notes)
            _isSaving.value = false
            if (success) {
                onDone()
            } else {
                _msg.value = "Failed to save student"
            }
        }
    }

    fun clearMsg() { _msg.value = null }
}

@Composable
fun AddStudentScreen(
    onBack: () -> Unit,
    viewModel: AddStudentViewModel = hiltViewModel()
) {
    var studentId by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    val isSaving by viewModel.isSaving.collectAsState()
    val msg by viewModel.msg.collectAsState()

    WarpBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp)
                .padding(top = 48.dp)
        ) {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack, modifier = Modifier.offset(x = (-12).dp)) {
                    Icon(Icons.Default.ArrowBack, null, tint = Color.White.copy(0.6f))
                }
                Spacer(Modifier.width(4.dp))
                Column {
                    Text("AUTHORIZATION", color = XScoutColors.NeonPurple, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                    Text("ADD NEW ENTITY", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color.White)
                }
            }

            Spacer(Modifier.height(32.dp))

            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                WarpTextField(
                    value = studentId,
                    onValueChange = { studentId = it },
                    label = "STUDENT ID",
                    placeholder = "e.g. S-10293",
                    error = if (msg != null && studentId.isBlank()) msg else null
                )

                WarpTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = "STUDENT NAME",
                    placeholder = "e.g. Jonathan Doe"
                )

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("NOTES / DESCRIPTION", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White.copy(0.4f)) },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    placeholder = { Text("Optional forensic notes...", color = Color.White.copy(0.2f), fontSize = 14.sp) },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = XScoutColors.NeonPurple,
                        unfocusedBorderColor = Color.White.copy(0.1f)
                    )
                )

                Spacer(Modifier.height(24.dp))

                Button(
                    onClick = { viewModel.addStudent(studentId, name, notes, onBack) },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    enabled = !isSaving,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = XScoutColors.NeonPurple,
                        contentColor = Color.White
                    )
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.Save, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(12.dp))
                        Text("AUTHORIZE STUDENT", fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                    }
                }

                if (msg != null) {
                    Text(msg!!, color = XScoutColors.Danger, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                    LaunchedEffect(msg) {
                        kotlinx.coroutines.delay(3000)
                        viewModel.clearMsg()
                    }
                }
            }
        }
    }
}
