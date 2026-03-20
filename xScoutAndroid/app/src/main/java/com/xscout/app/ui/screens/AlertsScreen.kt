package com.xscout.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.xscout.app.data.model.Alert
import com.xscout.app.data.model.AlertType
import com.xscout.app.ui.components.XScoutLogo
import com.xscout.app.ui.components.WarpBackground
import com.xscout.app.ui.components.GlassCard
import com.xscout.app.ui.theme.XScoutColors
import com.xscout.app.viewmodel.AlertsViewModel
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun AlertsScreen(
    onBack: () -> Unit,
    viewModel: AlertsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    WarpBackground {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp)
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
                        Text("SYSTEM ALERTS", color = XScoutColors.NeonPurple, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        val unread = uiState.alerts.count { !it.isRead }
                        Text(if (unread > 0) "$unread UNREAD THREATS" else "ALL CLEAR", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color.White)
                    }
                }
            }

            if (uiState.isLoading) {
                item {
                    Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = XScoutColors.NeonPurple)
                    }
                }
            } else if (uiState.alerts.isEmpty()) {
                item {
                    Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                        Text("No active alerts detected", color = Color.White.copy(0.3f), fontSize = 13.sp)
                    }
                }
            } else {
                items(uiState.alerts) { alert ->
                    AlertEntryRow(
                        alert = alert,
                        onMarkRead = { viewModel.markAsRead(alert.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun AlertEntryRow(alert: Alert, onMarkRead: () -> Unit) {
    val sdf = remember { SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault()) }
    val color = when (alert.type) {
        AlertType.INFO     -> XScoutColors.NeonCyan
        AlertType.WARNING  -> XScoutColors.Warning
        AlertType.DANGER   -> Color(0xFFFF6600)
        AlertType.CRITICAL -> XScoutColors.Danger
    }

    Surface(
        onClick = onMarkRead,
        enabled = !alert.isRead,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        color = Color.White.copy(if (alert.isRead) 0.01f else 0.03f),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (alert.isRead) Color.White.copy(0.05f) else color.copy(0.3f))
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(40.dp).background(color.copy(0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.NotificationsActive, null, tint = color, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(alert.studentName, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                    Spacer(Modifier.width(8.dp))
                    Surface(shape = RoundedCornerShape(4.dp), color = color.copy(0.1f)) {
                        Text(alert.type.name, color = color, fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp))
                    }
                }
                Text(alert.message, fontSize = 12.sp, color = Color.White.copy(0.6f))
                Text(sdf.format(Date(alert.timestamp)), fontSize = 10.sp, color = Color.White.copy(0.3f))
            }
            if (!alert.isRead) {
                Box(Modifier.size(8.dp).background(color, CircleShape))
            }
        }
    }
}
