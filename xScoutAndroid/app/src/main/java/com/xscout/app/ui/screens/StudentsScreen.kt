package com.xscout.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.xscout.app.data.model.StudentSession
import com.xscout.app.ui.components.XScoutLogo
import com.xscout.app.ui.components.WarpBackground
import com.xscout.app.ui.components.suspicionColor
import com.xscout.app.ui.theme.XScoutColors
import com.xscout.app.viewmodel.SessionsViewModel

@Composable
fun StudentsScreen(
    onBack: () -> Unit,
    onAddStudent: () -> Unit,
    viewModel: SessionsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Group sessions by student
    val studentMap = remember(uiState.sessions) {
        uiState.sessions.groupBy { it.studentId }
    }

    WarpBackground {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 80.dp) // Extra padding for FAB
        ) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .padding(top = 48.dp, bottom = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack, modifier = Modifier.offset(x = (-12).dp)) {
                        Icon(Icons.Default.ArrowBack, null, tint = Color.White.copy(0.6f))
                    }
                    Spacer(Modifier.width(4.dp))
                    Column {
                        Text("STUDENT DATABASE", color = XScoutColors.NeonPurple, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text("${studentMap.size} MONITORED ENTITIES", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color.White)
                    }
                }
            }

            if (uiState.isLoading) {
                item {
                    Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = XScoutColors.NeonPurple)
                    }
                }
            } else {
                items(studentMap.entries.toList()) { (studentId, sessions) ->
                    StudentEntryRow(
                        studentId = studentId,
                        sessions = sessions,
                    )
                }
            }
        }

        FloatingActionButton(
            onClick = onAddStudent,
            modifier = Modifier.align(Alignment.BottomEnd).padding(24.dp),
            containerColor = XScoutColors.NeonPurple,
            contentColor = Color.White,
            shape = RoundedCornerShape(16.dp)
        ) {
            Icon(Icons.Default.Add, "Authorize New Student")
        }
    }
}

@Composable
private fun StudentEntryRow(
    studentId: String,
    sessions: List<StudentSession>
) {
    val latest = sessions.maxByOrNull { it.timestamp }
    val avgAi = sessions.map { it.aiProbability }.average().toFloat()
    val suspColor = latest?.let { suspicionColor(it.suspicionLevel) } ?: Color.White.copy(0.4f)

    Surface(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        color = Color.White.copy(0.02f),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(0.05f))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(44.dp).background(XScoutColors.NeonPurple.copy(0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(latest?.studentName?.take(1) ?: "?", color = XScoutColors.NeonPurple, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    latest?.studentName ?: "Unknown",
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    fontSize = 16.sp
                )
                Text("ID: $studentId", fontSize = 12.sp, color = Color.White.copy(0.4f))
                Text("${sessions.size} ANALYSIS REPORTS", fontSize = 9.sp, color = XScoutColors.NeonPurple, fontWeight = FontWeight.Bold)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "${avgAi.toInt()}%",
                    fontWeight = FontWeight.Black,
                    fontSize = 22.sp,
                    color = suspColor
                )
                Text("AVG RISK", fontSize = 9.sp, color = Color.White.copy(0.3f), fontWeight = FontWeight.Bold)
            }
        }
    }
}
