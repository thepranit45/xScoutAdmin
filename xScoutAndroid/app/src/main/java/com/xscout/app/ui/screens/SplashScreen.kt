package com.xscout.app.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.animation.core.tween
import com.xscout.app.ui.components.XScoutLogo
import com.xscout.app.ui.components.WarpBackground
import com.xscout.app.viewmodel.LoginViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun SplashScreen(
    onNavigateToLogin: () -> Unit,
    onNavigateToDashboard: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val scale = remember { Animatable(0.8f) }
    val opacity = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        launch {
            scale.animateTo(1f, animationSpec = tween(1200))
        }
        launch {
            opacity.animateTo(1f, animationSpec = tween(1200))
        }
        delay(2000)
        if (viewModel.isAlreadyLoggedIn()) onNavigateToDashboard()
        else onNavigateToLogin()
    }

    WarpBackground {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.scale(scale.value).alpha(opacity.value)
            ) {
                XScoutLogo(fontSize = 48)
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "COMMAND CENTER",
                    fontSize = 12.sp,
                    letterSpacing = 4.sp,
                    color = Color.White.copy(0.4f),
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(48.dp))
                CircularProgressIndicator(
                    color = Color(0xFF8B5CF6),
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp
                )
            }
        }
    }
}
