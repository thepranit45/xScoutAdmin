package com.xscout.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.xscout.app.ui.components.XScoutLogo
import com.xscout.app.ui.components.WarpBackground
import com.xscout.app.ui.components.GlassCard
import com.xscout.app.ui.theme.XScoutColors
import com.xscout.app.viewmodel.DashboardViewModel

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showLogoutDialog by remember { mutableStateOf(false) }

    WarpBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
                .padding(top = 48.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack, modifier = Modifier.offset(x = (-12).dp)) {
                    Icon(Icons.Default.ArrowBack, null, tint = Color.White.copy(0.6f))
                }
                Spacer(Modifier.width(4.dp))
                Column {
                    Text("CONTROL CENTER", color = XScoutColors.NeonPurple, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                    Text("SYSTEM SETTINGS", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color.White)
                }
            }

            // Profile Section
             Surface(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                color = Color.White.copy(0.02f),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(0.05f))
            ) {
                Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .background(XScoutColors.NeonPurple.copy(0.1f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Person, null, tint = XScoutColors.NeonPurple, modifier = Modifier.size(32.dp))
                    }
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text("ADMINISTRATOR", fontWeight = FontWeight.Black, color = Color.White, fontSize = 18.sp, letterSpacing = 0.5.sp)
                        Text(uiState.adminEmail, fontSize = 13.sp, color = XScoutColors.NeonPurple, fontWeight = FontWeight.Bold)
                        Text("AUTH: LOCAL_SECURE_BYPASS", fontSize = 10.sp, color = Color.White.copy(0.3f), fontWeight = FontWeight.Bold)
                    }
                }
            }

            // App Identity
            Surface(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                color = Color.White.copy(0.02f),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(0.05f))
            ) {
                Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Shield, null, tint = XScoutColors.NeonPurple, modifier = Modifier.size(40.dp))
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text("xScout NEXUS", fontWeight = FontWeight.Black, color = Color.White, fontSize = 16.sp)
                        Text("CORE VERSION: 2.0.4 Premium", fontSize = 11.sp, color = Color.White.copy(0.4f), fontWeight = FontWeight.Bold)
                        Text("WARP_INTERFACE_ENGINE_READY", fontSize = 9.sp, color = XScoutColors.NeonCyan, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Status Rows
            Surface(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                color = Color.White.copy(0.02f),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(0.05f))
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    SettingDetail("CLOUD NODES", "SYNCED", XScoutColors.NeonGreen)
                    Divider(color = Color.White.copy(0.05f))
                    SettingDetail("REAL-TIME ANALYTICS", "OPTIMIZED", XScoutColors.NeonGreen)
                    Divider(color = Color.White.copy(0.05f))
                    SettingDetail("UI ENGINE", "WARP_DOT_GRID", XScoutColors.NeonPurple)
                }
            }

            Spacer(Modifier.weight(1f))

            // Logout (Dangerous Action)
            Button(
                onClick = { showLogoutDialog = true },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = XScoutColors.Danger.copy(0.1f),
                    contentColor = XScoutColors.Danger
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, XScoutColors.Danger.copy(0.3f))
            ) {
                Icon(Icons.Default.ExitToApp, null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Text("TERMINATE SESSION", fontWeight = FontWeight.Black, letterSpacing = 1.sp)
            }
            Spacer(Modifier.height(24.dp))
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("TERMINATE COMMAND?", color = Color.White, fontWeight = FontWeight.Black) },
            text = { Text("Are you sure you want to sign out? Data monitoring will continue in the background.", color = Color.White.copy(0.6f)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.signOut()
                    onLogout()
                }) {
                    Text("TERMINATE", color = XScoutColors.Danger, fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("ABORT", color = Color.White.copy(0.4f), fontWeight = FontWeight.Bold)
                }
            },
            containerColor = Color(0xFF0F0F0F),
            shape = RoundedCornerShape(16.dp)
        )
    }
}

@Composable
private fun SettingDetail(label: String, value: String, color: Color) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = Color.White.copy(0.3f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Text(value, color = color, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 0.5.sp)
    }
}
