package com.xscout.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
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
import com.xscout.app.data.model.SuspicionLevel
import com.xscout.app.ui.components.XScoutLogo
import com.xscout.app.ui.components.WarpBackground
import com.xscout.app.ui.components.NeonProgressBar
import com.xscout.app.ui.components.suspicionColor
import com.xscout.app.ui.components.suspicionLabel
import com.xscout.app.ui.theme.XScoutColors
import com.xscout.app.viewmodel.SessionsViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionsScreen(
    onBack: () -> Unit,
    onSessionClick: (String) -> Unit,
    viewModel: SessionsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val filterOptions = listOf(null, SuspicionLevel.LOW, SuspicionLevel.MEDIUM, SuspicionLevel.HIGH, SuspicionLevel.CRITICAL)

    WarpBackground {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            item {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(top = 48.dp, bottom = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack, modifier = Modifier.offset(x = (-12).dp)) {
                        Icon(Icons.Default.ArrowBack, null, tint = Color.White.copy(0.6f))
                    }
                    Spacer(Modifier.width(4.dp))
                    Column {
                        Text("SESSION HISTORY", color = XScoutColors.NeonPurple, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text("${uiState.filteredSessions.size} FORENSIC LOGS", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color.White)
                    }
                }
            }

            // Search (Website Style)
            item {
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = viewModel::onSearchChange,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    placeholder = { Text("Filter by student name or session ID...", color = Color.White.copy(0.3f), fontSize = 14.sp) },
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = Color.White.copy(0.3f)) },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = XScoutColors.NeonPurple,
                        unfocusedBorderColor = Color.White.copy(0.1f),
                        cursorColor = XScoutColors.NeonPurple
                    ),
                    singleLine = true
                )
                Spacer(Modifier.height(12.dp))
            }

            // Filter Chips
            item {
                LazyRow(
                    modifier = Modifier.padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filterOptions) { level ->
                        val selected = uiState.filterLevel == level
                        val label = level?.let { suspicionLabel(it) } ?: "ALL"
                        val color = level?.let { suspicionColor(it) } ?: Color.White

                        Surface(
                            onClick = { viewModel.onFilterChange(level) },
                            modifier = Modifier.height(32.dp),
                            shape = RoundedCornerShape(8.dp),
                            color = if (selected) color.copy(0.1f) else Color.White.copy(0.02f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) color.copy(0.4f) else Color.White.copy(0.05f))
                        ) {
                            Box(Modifier.padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                                Text(label, color = if (selected) color else Color.White.copy(0.4f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
                Spacer(Modifier.height(20.dp))
            }

            if (uiState.isLoading) {
                item { Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = XScoutColors.NeonPurple) } }
            } else if (uiState.filteredSessions.isEmpty()) {
                item { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No records match criteria", color = Color.White.copy(0.3f), fontSize = 13.sp) } }
            } else {
                items(uiState.filteredSessions) { session ->
                    SessionEntryRow(session, onClick = { onSessionClick(session.id) })
                }
            }
        }
    }
}

@Composable
fun SessionEntryRow(session: StudentSession, onClick: () -> Unit) {
    val sdf = remember { SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault()) }
    val suspColor = suspicionColor(session.suspicionLevel)

    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        color = Color.White.copy(0.02f),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(0.05f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(36.dp).background(XScoutColors.NeonPurple.copy(0.1f), CircleShape), contentAlignment = Alignment.Center) {
                    Text(session.studentName.take(1), color = XScoutColors.NeonPurple, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(session.studentName, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(sdf.format(Date(session.timestamp)), color = Color.White.copy(0.4f), fontSize = 11.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("${session.aiProbability.toInt()}% AI", color = suspColor, fontSize = 16.sp, fontWeight = FontWeight.Black)
                    Text(suspicionLabel(session.suspicionLevel), color = suspColor.copy(0.6f), fontSize = 8.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(12.dp))
            NeonProgressBar(session.aiProbability, color = suspColor)
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(session.stack, color = Color.White.copy(0.3f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Text("WPM: ${session.biometrics.wpm.toInt()}", color = Color.White.copy(0.3f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
