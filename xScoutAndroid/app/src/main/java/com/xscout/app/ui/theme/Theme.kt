package com.xscout.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ─── xScout Color Palette ───────────────────────────────────────────────────
object XScoutColors {
    val NeonPurple       = Color(0xFFB026FF)
    val NeonPink         = Color(0xFFFF26B9)
    val NeonCyan         = Color(0xFF26FFF5)
    val NeonGreen        = Color(0xFF39FF14)
    val DeepVoid         = Color(0xFF0A0A0A) // Warp.dev Charcoal Black
    val DarkCard         = Color(0xFF141419)
    val GridDot          = Color(0xFF222222)
    val GlassWhite       = Color(0x0AFFFFFF)
    val GlassBorder      = Color(0x1AFFFFFF)
    val TextPrimary      = Color(0xFFFFFFFF)
    val TextSecondary    = Color(0xFFB0B0D0)
    val TextMuted        = Color(0xFF6060A0)
    val Success          = Color(0xFF39FF14)
    val Warning          = Color(0xFFFF9500)
    val Danger           = Color(0xFFFF3B47)
    val Surface          = Color(0xFF160824)
    val SurfaceVariant   = Color(0xFF1E0D35)
}

data class XScoutColorScheme(
    val primary: Color = XScoutColors.NeonPurple,
    val secondary: Color = XScoutColors.NeonPink,
    val accent: Color = XScoutColors.NeonCyan,
    val background: Color = XScoutColors.DeepVoid,
    val surface: Color = XScoutColors.Surface,
    val surfaceVariant: Color = XScoutColors.SurfaceVariant,
    val card: Color = XScoutColors.DarkCard,
    val glassWhite: Color = XScoutColors.GlassWhite,
    val glassBorder: Color = XScoutColors.GlassBorder,
    val onPrimary: Color = Color.White,
    val onBackground: Color = XScoutColors.TextPrimary,
    val onSurface: Color = XScoutColors.TextPrimary,
    val textSecondary: Color = XScoutColors.TextSecondary,
    val textMuted: Color = XScoutColors.TextMuted,
    val success: Color = XScoutColors.Success,
    val warning: Color = XScoutColors.Warning,
    val danger: Color = XScoutColors.Danger,
    val neonGreen: Color = XScoutColors.NeonGreen,
)

val LocalXScoutColors = staticCompositionLocalOf { XScoutColorScheme() }

private val DarkColorScheme = darkColorScheme(
    primary = XScoutColors.NeonPurple,
    secondary = XScoutColors.NeonPink,
    tertiary = XScoutColors.NeonCyan,
    background = XScoutColors.DeepVoid,
    surface = XScoutColors.Surface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = XScoutColors.TextPrimary,
    onSurface = XScoutColors.TextPrimary,
)

object XScoutTheme {
    val colors: XScoutColorScheme
        @Composable get() = LocalXScoutColors.current
}

@Composable
fun XScoutTheme(
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(
        LocalXScoutColors provides XScoutColorScheme()
    ) {
        MaterialTheme(
            colorScheme = DarkColorScheme,
            typography = XScoutTypography,
            content = content
        )
    }
}
