package com.xscout.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
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
import com.xscout.app.data.model.StudentSession
import com.xscout.app.data.repository.XScoutRepository
import com.xscout.app.ui.components.XScoutLogo
import com.xscout.app.ui.components.WarpBackground
import com.xscout.app.ui.components.GlassCard
import com.xscout.app.ui.components.NeonProgressBar
import com.xscout.app.ui.components.suspicionColor
import com.xscout.app.ui.components.suspicionLabel
import com.xscout.app.ui.theme.XScoutColors
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── ViewModel ───────────────────────────────────────────────────────────────
@HiltViewModel
class SessionDetailViewModel @Inject constructor(
    private val repository: XScoutRepository
) : ViewModel() {
    private val _session = MutableStateFlow<StudentSession?>(null)
    val session = _session.asStateFlow()
    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    fun load(sessionId: String) {
        viewModelScope.launch {
            _session.value = repository.getSession(sessionId)
            _isLoading.value = false
        }
    }
}

// ─── Screen ──────────────────────────────────────────────────────────────────
@Composable
fun SessionDetailScreen(
    sessionId: String,
    onBack: () -> Unit,
    viewModel: SessionDetailViewModel = hiltViewModel()
) {
    val session by viewModel.session.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(sessionId) { viewModel.load(sessionId) }

    WarpBackground {
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = XScoutColors.NeonPurple)
            }
        } else {
            val s = session
            if (s == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Session not found", color = Color.White.copy(0.3f))
                }
            } else {
                val suspColor = suspicionColor(s.suspicionLevel)
                
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 40.dp)
                ) {
                    // ── Header (Forensic Identity) ──
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp)
                                .padding(top = 48.dp, bottom = 24.dp)
                        ) {
                            IconButton(onClick = onBack, modifier = Modifier.offset(x = (-12).dp)) {
                                Icon(Icons.Default.ArrowBack, null, tint = Color.White.copy(0.6f))
                            }
                            Spacer(Modifier.height(8.dp))
                            Text("FORENSIC ANALYSIS", color = XScoutColors.NeonPurple, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                            Text(s.studentName, fontSize = 32.sp, fontWeight = FontWeight.Black, color = Color.White)
                            Text("ID: ${s.studentId}", fontSize = 14.sp, color = Color.White.copy(0.4f))
                            
                            Spacer(Modifier.height(32.dp))
                            
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    "${s.aiProbability.toInt()}%",
                                    fontSize = 64.sp,
                                    fontWeight = FontWeight.Black,
                                    color = suspColor
                                )
                                Spacer(Modifier.width(16.dp))
                                Column {
                                    Surface(shape = RoundedCornerShape(4.dp), color = suspColor.copy(0.1f), border = androidx.compose.foundation.BorderStroke(1.dp, suspColor.copy(0.2f))) {
                                        Text(
                                            suspicionLabel(s.suspicionLevel),
                                            color = suspColor,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                        )
                                    }
                                    Text("AI PROBABILITY", fontSize = 10.sp, color = Color.White.copy(0.3f), fontWeight = FontWeight.Bold)
                                }
                            }
                            Spacer(Modifier.height(12.dp))
                            NeonProgressBar(s.aiProbability, color = suspColor)
                        }
                    }

                    // ── Biometrics (Warp Style) ──
                    item {
                        Text(
                            "RECOVERY BIOMETRICS",
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                            color = Color.White.copy(0.3f),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            BiometricBlock(Modifier.weight(1f), "WPM", "${s.biometrics.wpm.toInt()}", XScoutColors.NeonCyan)
                            BiometricBlock(Modifier.weight(1f), "PASTE", "${s.biometrics.pasteEvents}", XScoutColors.Danger)
                            BiometricBlock(Modifier.weight(1f), "BKS", "${s.biometrics.backspaceRate.toInt()}%", XScoutColors.Warning)
                        }
                        Spacer(Modifier.height(24.dp))
                    }

                    // ── Environment Details ──
                    item {
                         GlassCard(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                            cornerRadius = 16.dp,
                            borderColor = Color.White.copy(0.05f)
                        ) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                DetailSpec("TECH STACK", s.stack)
                                Box(Modifier.width(1.dp).height(30.dp).background(Color.White.copy(0.1f)).align(Alignment.CenterVertically))
                                DetailSpec("DURATION", "${s.duration / 60}m ${s.duration % 60}s")
                            }
                        }
                        Spacer(Modifier.height(24.dp))
                    }

                    // ── Activity Log (the table from website) ──
                    if (s.titleHistory.isNotEmpty()) {
                        item {
                            Text(
                                "WINDOW / BROWSER LOGS",
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                                color = Color.White.copy(0.3f),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                        }
                        itemsIndexed(s.titleHistory) { index, title ->
                            val isSuspicious = listOf("ChatGPT", "OpenAI", "Claude", "Copilot", "Gemini", "StackOverflow").any { title.contains(it, ignoreCase = true) }
                            LogEntry(index + 1, title, isSuspicious)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BiometricBlock(modifier: Modifier, label: String, value: String, color: Color) {
    Surface(
        modifier = modifier,
        color = Color.White.copy(0.02f),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(0.05f))
    ) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, color = color, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(label, color = Color.White.copy(0.4f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun DetailSpec(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = Color.White.copy(0.3f), fontSize = 9.sp, fontWeight = FontWeight.Bold)
        Text(value, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun LogEntry(index: Int, title: String, isSuspicious: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("$index", color = Color.White.copy(0.2f), fontSize = 11.sp, modifier = Modifier.width(20.dp))
        Surface(
            modifier = Modifier.weight(1f),
            color = if (isSuspicious) XScoutColors.Danger.copy(0.05f) else Color.White.copy(0.02f),
            shape = RoundedCornerShape(8.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, if (isSuspicious) XScoutColors.Danger.copy(0.2f) else Color.White.copy(0.05f))
        ) {
            Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    title, 
                    color = if (isSuspicious) XScoutColors.Danger else Color.White.copy(0.7f), 
                    fontSize = 12.sp, 
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                if (isSuspicious) {
                    Icon(Icons.Default.Visibility, null, tint = XScoutColors.Danger, modifier = Modifier.size(14.dp))
                }
            }
        }
    }
}
