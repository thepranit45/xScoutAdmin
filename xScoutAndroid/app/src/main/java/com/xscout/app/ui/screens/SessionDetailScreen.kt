package com.xscout.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.xscout.app.data.model.TechDetails
import com.xscout.app.data.model.DirectoryItem
import com.xscout.app.data.model.SessionSnapshot
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
    
    private val _snapshots = MutableStateFlow<List<SessionSnapshot>>(emptyList())
    val snapshots = _snapshots.asStateFlow()

    fun load(sessionId: String) {
        viewModelScope.launch {
            _session.value = repository.getSession(sessionId)
            _isLoading.value = false
        }
    }

    fun loadReplay(sessionId: String) {
        viewModelScope.launch {
            _snapshots.value = repository.getSnapshotHistory(sessionId)
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
    val snapshots by viewModel.snapshots.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var showReplay by remember { mutableStateOf(false) }
    var showTechStack by remember { mutableStateOf(false) }
    var showExplorer by remember { mutableStateOf(false) }

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
                    contentPadding = PaddingValues(bottom = 60.dp)
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

                    // ── Advanced Actions (Cinema/Tech/Explorer) ──
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            ActionButton(Modifier.weight(1f), "REPLAY", XScoutColors.NeonPurple) {
                                viewModel.loadReplay(s.id)
                                showReplay = true
                            }
                            ActionButton(Modifier.weight(1f), "STACK", XScoutColors.NeonCyan) { showTechStack = true }
                            ActionButton(Modifier.weight(1f), "FILES", Color(0xFFFACC15)) { showExplorer = true }
                        }
                        Spacer(Modifier.height(24.dp))
                    }

                    // ── Biometrics ──
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

                    // ── Activity Log ──
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

    // ── Dialogs ──
    if (showReplay && snapshots.isNotEmpty()) {
        ReplayDialog(snapshots) { showReplay = false }
    }
    
    if (showTechStack && session?.techDetails != null) {
        TechStackDialog(session!!.techDetails!!) { showTechStack = false }
    }
    
    if (showExplorer && session?.projectStructure != null) {
        ExplorerDialog(session!!.projectStructure!!) { showExplorer = false }
    }
}

@Composable
fun ActionButton(modifier: Modifier, label: String, color: Color, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier.height(44.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color.copy(0.1f)),
        shape = RoundedCornerShape(8.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(0.3f)),
        contentPadding = PaddingValues(0.dp)
    ) {
        Text(label, color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReplayDialog(snapshots: List<com.xscout.app.data.model.SessionSnapshot>, onDismiss: () -> Unit) {
    var currentIndex by remember { mutableStateOf(0f) }
    val currentSnapshot = snapshots[currentIndex.toInt().coerceIn(0, snapshots.size - 1)]

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F0518),
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color.White.copy(0.2f)) }
    ) {
        Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
            Text("CINEMA MODE REPLAY", color = XScoutColors.NeonPurple, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text(currentSnapshot.file ?: "Active Editor", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            
            Spacer(Modifier.height(20.dp))
            
            // Timeline
            Slider(
                value = currentIndex,
                onValueChange = { currentIndex = it },
                valueRange = 0f..(snapshots.size - 1).coerceAtLeast(0).toFloat(),
                colors = SliderDefaults.colors(thumbColor = XScoutColors.NeonPurple, activeTrackColor = XScoutColors.NeonPurple)
            )
            
            Spacer(Modifier.height(10.dp))
            
            // Code Viewer
            Surface(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                color = Color.Black.copy(0.3f),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(0.05f))
            ) {
                LazyColumn(modifier = Modifier.padding(16.dp)) {
                    item {
                        Text(
                            currentSnapshot.code ?: "// No code data at this timestamp",
                            color = Color.White.copy(0.8f),
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TechStackDialog(tech: com.xscout.app.data.model.TechDetails, onDismiss: () -> Unit) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F0518)
    ) {
        Column(modifier = Modifier.padding(20.dp).fillMaxWidth()) {
            Text("TECHNOLOGY STACK", color = XScoutColors.NeonCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(20.dp))
            
            DetailSpec("AUTHOR", tech.author)
            Spacer(Modifier.height(12.dp))
            DetailSpec("REPOSITORY", tech.repository ?: "None Detected")
            
            Spacer(Modifier.height(24.dp))
            
            tech.categories.forEach { (category, techs) ->
                if (techs.isNotEmpty()) {
                    Text(category.uppercase(), color = Color.White.copy(0.3f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Row(modifier = Modifier.padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        techs.forEach { name ->
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color.White.copy(0.05f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(0.1f))
                            ) {
                                Text(name, color = Color.White, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExplorerDialog(root: com.xscout.app.data.model.DirectoryItem, onDismiss: () -> Unit) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F0518)
    ) {
        Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
            Text("WORKSPACE EXPLORER", color = Color(0xFFFACC15), fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(20.dp))
            
            LazyColumn {
                item { ExplorerItem(root, 0) }
            }
        }
    }
}

@Composable
fun ExplorerItem(item: com.xscout.app.data.model.DirectoryItem, depth: Int) {
    var expanded by remember { mutableStateOf(depth == 0) }
    
    Column {
        Row(
            modifier = Modifier.clickable { expanded = !expanded }
                .fillMaxWidth()
                .padding(vertical = 4.dp)
                .padding(start = (depth * 20).dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(if (item.type == "directory") "📂" else "📄", fontSize = 14.sp)
            Spacer(Modifier.width(8.dp))
            Text(item.name, color = if (item.type == "directory") Color.White else Color.White.copy(0.6f), fontSize = 14.sp)
        }
        
        if (expanded && item.children.isNotEmpty()) {
            item.children.forEach { child ->
                ExplorerItem(child, depth + 1)
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
