package com.xscout.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.xscout.app.data.model.StudentSession
import com.xscout.app.ui.components.XScoutLogo
import com.xscout.app.ui.components.WarpBackground
import com.xscout.app.ui.components.GlassCard
import com.xscout.app.ui.components.NeonProgressBar
import com.xscout.app.ui.components.suspicionColor
import com.xscout.app.ui.components.suspicionLabel
import com.xscout.app.ui.theme.XScoutColors
import com.xscout.app.viewmodel.DashboardViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToSessions: () -> Unit,
    onNavigateToStudents: () -> Unit,
    onNavigateToAlerts: () -> Unit,
    onNavigateToSettings: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val stats = uiState.stats
    var searchQuery by remember { mutableStateOf("") }

    WarpBackground {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            // ── Top Bar (Website Style) ──
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 24.dp).padding(top = 20.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    XScoutLogo(fontSize = 22)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = XScoutColors.NeonGreen.copy(0.1f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, XScoutColors.NeonGreen.copy(0.2f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(Modifier.size(6.dp).clip(CircleShape).background(XScoutColors.NeonGreen))
                                Spacer(Modifier.width(6.dp))
                                Text("LIVE", color = XScoutColors.NeonGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        IconButton(onClick = onNavigateToSettings) {
                            Icon(Icons.Default.AccountCircle, null, tint = Color.White.copy(0.6f))
                        }
                    }
                }
            }

            // ── Search Bar (centerpiece of index.html) ──
            item {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    placeholder = { Text("Search Session / Student ID...", color = Color.White.copy(0.3f), fontSize = 14.sp) },
                    trailingIcon = { Icon(Icons.Default.Search, null, tint = Color.White.copy(0.3f)) },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = XScoutColors.NeonPurple,
                        unfocusedBorderColor = Color.White.copy(0.1f)
                    ),
                    singleLine = true
                )
                Spacer(Modifier.height(24.dp))
            }

            // ── Stats Summary ──
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        label = "Active Threats",
                        value = "${stats.highRiskCount}",
                        color = XScoutColors.Danger
                    )
                    StatCard(
                        modifier = Modifier.weight(1f).clickable { onNavigateToStudents() },
                        label = "Monitored",
                        value = "${stats.totalStudents}",
                        color = XScoutColors.NeonCyan
                    )
                }
                Spacer(Modifier.height(24.dp))
            }

            // ── Quick Access (Priority Alerts style) ──
            item {
                Text(
                    "COMMAND CENTER TABS",
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                    color = Color.White.copy(0.4f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    TabButton(Modifier.weight(1f), "Overview", Icons.Default.Dashboard, true) { }
                    TabButton(Modifier.weight(1f), "Database", Icons.Default.Group, false, onNavigateToStudents)
                    TabButton(Modifier.weight(1f), "Forensics", Icons.Default.Search, false, onNavigateToSessions)
                    TabButton(Modifier.weight(1f), "Alerts", Icons.Default.Notifications, false, onNavigateToAlerts)
                }
                Spacer(Modifier.height(24.dp))
            }

            // ── Recent Activity Table (Simplified) ──
            item {
                Text(
                    "RECENT FORENSIC ACTIVITY",
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                    color = Color.White.copy(0.4f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }

            if (uiState.isLoading) {
                item { Box(Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = XScoutColors.NeonPurple) } }
            } else if (uiState.recentSessions.isEmpty()) {
                item { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No active threads detected", color = Color.White.copy(0.3f), fontSize = 13.sp) } }
            } else {
                items(uiState.recentSessions) { session ->
                    ActivityRow(session, { onNavigateToSessions() })
                }
            }
        }
    }
}

@Composable
fun TabButton(
    modifier: Modifier,
    label: String,
    icon: ImageVector,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(44.dp),
        shape = RoundedCornerShape(8.dp),
        color = if (isActive) XScoutColors.NeonPurple.copy(0.1f) else Color.Transparent,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (isActive) XScoutColors.NeonPurple.copy(0.3f) else Color.White.copy(0.05f))
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(icon, null, tint = if (isActive) XScoutColors.NeonPurple else Color.White.copy(0.4f), modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, color = if (isActive) Color.White else Color.White.copy(0.4f), fontSize = 12.sp, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
fun StatCard(modifier: Modifier, label: String, value: String, color: Color) {
    GlassCard(
        modifier = modifier,
        cornerRadius = 16.dp,
        borderColor = Color.White.copy(0.05f)
    ) {
        Column {
            Text(label, color = Color.White.copy(0.4f), fontSize = 11.sp, fontWeight = FontWeight.Medium)
            Text(value, color = color, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun ActivityRow(session: StudentSession, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 4.dp),
        color = Color.White.copy(0.02f),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(0.05f))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.size(36.dp).background(Color.White.copy(0.05f), CircleShape), contentAlignment = Alignment.Center) {
                Text(session.studentName.take(1), color = Color.White, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(session.studentName, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(session.stack, color = Color.White.copy(0.4f), fontSize = 11.sp)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${session.aiProbability.toInt()}% AI", color = suspicionColor(session.suspicionLevel), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                Text("RISK", color = suspicionColor(session.suspicionLevel).copy(0.6f), fontSize = 9.sp, fontWeight = FontWeight.Black)
            }
        }
    }
}
