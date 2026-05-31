package com.example.clockin.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme =
    darkColorScheme(
        primary = PrimaryOrange,
        secondary = LightOrangeText,
        tertiary = BrownHeader,
        background = Color(0xFF121212),
        surface = Color(0xFF1F1F1F),
        onPrimary = Color.White,
        onBackground = Color(0xFFEEEEEE),
        onSurface = Color(0xFFEEEEEE),
    )

private val LightColorScheme =
    lightColorScheme(
        primary = PrimaryOrange,
        secondary = LightOrangeText,
        tertiary = BrownHeader,
        background = Color.White,
        surface = Color.White,
        onPrimary = Color.White,
        onBackground = Color.Black,
        onSurface = Color.Black,
    )

@Composable
fun ClockInTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content,
    )
}
