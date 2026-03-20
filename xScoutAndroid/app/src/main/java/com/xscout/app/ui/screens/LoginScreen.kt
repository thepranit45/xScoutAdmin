package com.xscout.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.xscout.app.ui.components.XScoutLogo
import com.xscout.app.ui.components.WarpBackground
import com.xscout.app.ui.components.GlassCard
import com.xscout.app.ui.components.WarpTextField
import com.xscout.app.ui.theme.XScoutColors
import com.xscout.app.viewmodel.LoginViewModel

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var passwordVisible by remember { mutableStateOf(false) }
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { visible = true }
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) onLoginSuccess()
    }

    WarpBackground {
        // Decorative Orbs (Warp Style)
        Box(
            modifier = Modifier
                .size(400.dp)
                .offset(x = 150.dp, y = (-200).dp)
                .background(
                    Brush.radialGradient(listOf(Color(0x0DFF26B9), Color.Transparent)),
                    CircleShape
                )
        )
        Box(
            modifier = Modifier
                .size(400.dp)
                .offset(x = (-150).dp, y = 200.dp)
                .background(
                    Brush.radialGradient(listOf(Color(0x0DB026FF), Color.Transparent)),
                    CircleShape
                )
        )

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            AnimatedVisibility(
                visible = visible,
                enter = fadeIn(animationSpec = androidx.compose.animation.core.tween(1000)) +
                        slideInVertically(animationSpec = androidx.compose.animation.core.tween(1000)) { 100 }
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    XScoutLogo(fontSize = 32)
                    Text(
                        "Secure Admin Dashboard",
                        color = XScoutColors.TextMuted,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 4.dp, bottom = 40.dp)
                    )

                    GlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        cornerRadius = 24.dp,
                        borderColor = Color.White.copy(0.1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(8.dp),
                            verticalArrangement = Arrangement.spacedBy(20.dp)
                        ) {
                            // Fields
                            WarpTextField(
                                value = uiState.email,
                                onValueChange = viewModel::onEmailChange,
                                label = "Admin Username",
                                leadingIcon = Icons.Default.Email,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                            )

                            WarpTextField(
                                value = uiState.password,
                                onValueChange = viewModel::onPasswordChange,
                                label = "Password",
                                leadingIcon = Icons.Default.Lock,
                                isPassword = true,
                                passwordVisible = passwordVisible,
                                onPasswordToggle = { passwordVisible = !passwordVisible },
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done)
                            )

                            // Error
                            if (uiState.error != null) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Shield, contentDescription = null, tint = XScoutColors.Danger, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(uiState.error!!, color = XScoutColors.Danger, fontSize = 13.sp)
                                }
                            }

                            // Sign In Button
                            Button(
                                onClick = viewModel::signIn,
                                enabled = !uiState.isLoading,
                                modifier = Modifier.fillMaxWidth().height(54.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.Transparent,
                                    contentColor = Color.White,
                                )
                            ) {
                                Box(
                                    Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.linearGradient(listOf(Color(0xFFD946EF), Color(0xFF8B5CF6))),
                                            RoundedCornerShape(12.dp)
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (uiState.isLoading) {
                                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                    } else {
                                        Text("SIGN IN", fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                                    }
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(32.dp))
                    Text(
                        "© 2026 xScout Inc. System Secure.",
                        color = Color.White.copy(0.2f),
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}
