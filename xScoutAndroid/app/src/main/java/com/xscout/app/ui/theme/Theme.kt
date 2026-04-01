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

// ─── xScout Dashboard-Matched Color Palette ─────────────────────────────────
object XScoutColors {
    val XScoutCyan       = Color(0xFF06B6D4) // Primary Analytical Cyan
    val XScoutBlue       = Color(0xFF3B82F6) // Secure Azure Accent
    val AdminGreen       = Color(0xFF3DDC84) // Android/Success Green
    val DeepVoid         = Color(0xFF03040B) // Dashboard Background
    val DarkCard         = Color(0xFF11131C) // Component Background
    val GridDot          = Color(0x1AFFFFFF) // Mesh Utility
    val GlassWhite       = Color(0x14FFFFFF) // 8% Frost Overlay
    val GlassBorder      = Color(0x1AFFFFFF) // 10% Micro-Border
    val TextPrimary      = Color(0xFFFFFFFF)
    val TextSecondary    = Color(0xFFE2E1EF) // Analytic secondary text
    val TextMuted        = Color(0xFF6B7280) // Metadata Gray
    val Success          = Color(0xFF3DDC84)
    val Warning          = Color(0xFFFACC15) // Diagnostic Yellow
    val Danger           = Color(0xFFEF4444) // Secure Alert Red (de-saturated)
    val Surface          = Color(0xFF0F111A)
    val SurfaceVariant   = Color(0xFF1B1E2B)
}

data class XScoutColorScheme(
    val primary: Color = XScoutColors.XScoutCyan,
    val secondary: Color = XScoutColors.XScoutBlue,
    val accent: Color = XScoutColors.AdminGreen,
    val background: Color = XScoutColors.DeepVoid,
    val surface: Color = XScoutColors.Surface,
    val surfaceVariant: Color = XScoutColors.SurfaceVariant,
    val card: Color = XScoutColors.DarkCard,
    val glassWhite: Color = XScoutColors.GlassWhite,
    val glassBorder: Color = XScoutColors.GlassBorder,
    val onPrimary: Color = Color.Black,
    val onBackground: Color = XScoutColors.TextPrimary,
    val onSurface: Color = XScoutColors.TextPrimary,
    val textSecondary: Color = XScoutColors.TextSecondary,
    val textMuted: Color = XScoutColors.TextMuted,
    val success: Color = XScoutColors.Success,
    val warning: Color = XScoutColors.Warning,
    val danger: Color = XScoutColors.Danger,
    val adminGreen: Color = XScoutColors.AdminGreen,
)

val LocalXScoutColors = staticCompositionLocalOf { XScoutColorScheme() }

private val DarkColorScheme = darkColorScheme(
    primary = XScoutColors.XScoutCyan,
    secondary = XScoutColors.XScoutBlue,
    tertiary = XScoutColors.AdminGreen,
    background = XScoutColors.DeepVoid,
    surface = XScoutColors.Surface,
    onPrimary = Color.Black,
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
