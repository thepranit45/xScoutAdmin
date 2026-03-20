package com.xscout.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xscout.app.data.model.SuspicionLevel
import com.xscout.app.ui.theme.XScoutColors
import com.xscout.app.ui.theme.XScoutTheme

// ─── Warp Grid Background ────────────────────────────────────────────────────
@Composable
fun WarpBackground(content: @Composable BoxScope.() -> Unit) {
    val dotColor = XScoutColors.GridDot
    val bgColor = XScoutColors.DeepVoid

    Box(modifier = Modifier.fillMaxSize().background(bgColor)) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val dotRadius = 1.dp.toPx()
            val spacing = 32.dp.toPx()
            
            var x = 0f
            while (x < size.width) {
                var y = 0f
                while (y < size.height) {
                    drawCircle(
                        color = dotColor,
                        radius = dotRadius,
                        center = Offset(x, y)
                    )
                    y += spacing
                }
                x += spacing
            }
        }
        content()
    }
}

// ─── Stylized Logo ──────────────────────────────────────────────────────────
@Composable
fun XScoutLogo(fontSize: Int = 24) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = "x",
            style = TextStyle(
                brush = Brush.linearGradient(listOf(Color(0xFFD946EF), Color(0xFF8B5CF6))),
                fontSize = (fontSize * 1.5).sp,
                fontWeight = FontWeight.Black
            )
        )
        Text(
            text = "Scout",
            fontSize = fontSize.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
    }
}

// ─── Glass Card ─────────────────────────────────────────────────────────────
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 16.dp,
    borderColor: Color = XScoutColors.GlassBorder,
    content: @Composable BoxScope.() -> Unit
) {
    val colors = XScoutTheme.colors
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        colors.glassWhite,
                        Color(0x0DFFFFFF)
                    )
                )
            )
            .border(
                width = 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(cornerRadius)
            )
            .padding(16.dp),
        content = content
    )
}

// ─── Neon Progress Bar ───────────────────────────────────────────────────────
@Composable
fun NeonProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    color: Color = XScoutColors.NeonPurple
) {
    LinearProgressIndicator(
        progress = { (progress / 100f).coerceIn(0f, 1f) },
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp)),
        color = color,
        trackColor = Color(0x33FFFFFF),
        strokeCap = StrokeCap.Round
    )
}

// ─── Suspicion color helper ──────────────────────────────────────────────────
fun suspicionColor(level: SuspicionLevel): Color = when (level) {
    SuspicionLevel.LOW      -> XScoutColors.NeonGreen
    SuspicionLevel.MEDIUM   -> XScoutColors.Warning
    SuspicionLevel.HIGH     -> Color(0xFFFF6600)
    SuspicionLevel.CRITICAL -> XScoutColors.Danger
}

fun suspicionLabel(level: SuspicionLevel): String = when (level) {
    SuspicionLevel.LOW      -> "LOW RISK"
    SuspicionLevel.MEDIUM   -> "MEDIUM"
    SuspicionLevel.HIGH     -> "HIGH RISK"
    SuspicionLevel.CRITICAL -> "CRITICAL"
}

// ─── Premium Text Field ─────────────────────────────────────────────────────
@Composable
fun WarpTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String = "",
    leadingIcon: ImageVector? = null,
    isPassword: Boolean = false,
    passwordVisible: Boolean = false,
    onPasswordToggle: () -> Unit = {},
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    error: String? = null
) {
    Column {
        Text(
            text = label,
            color = if (error != null) XScoutColors.Danger else Color.White.copy(0.4f),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp),
            letterSpacing = 1.sp
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(placeholder, color = Color.White.copy(0.2f), fontSize = 14.sp) },
            leadingIcon = leadingIcon?.let { { Icon(it, null, tint = Color.White.copy(0.3f), modifier = Modifier.size(20.dp)) } },
            trailingIcon = if (isPassword) {
                {
                    IconButton(onClick = onPasswordToggle) {
                        Icon(if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, null, tint = Color.White.copy(0.3f))
                    }
                }
            } else null,
            visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = keyboardOptions,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = XScoutColors.NeonPurple,
                unfocusedBorderColor = Color.White.copy(0.1f),
                cursorColor = XScoutColors.NeonPurple,
                errorBorderColor = XScoutColors.Danger,
                focusedLabelColor = XScoutColors.NeonPurple,
                unfocusedLabelColor = Color.White.copy(0.4f)
            ),
            shape = RoundedCornerShape(12.dp),
            singleLine = true,
            isError = error != null
        )
    }
}
