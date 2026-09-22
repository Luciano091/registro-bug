package br.com.ritmesa.bisburger.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Orange = Color(0xFFF97316)
val Dark = Color(0xFF111111)
val Surface = Color(0xFFF7F7F8)

private val BisBurgerColors = lightColorScheme(
    primary = Orange,
    onPrimary = Color.White,
    secondary = Color(0xFFFACC15),
    background = Surface,
    surface = Color.White,
    onBackground = Color(0xFF18181B),
    onSurface = Color(0xFF18181B),
)

@Composable
fun BisBurgerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = BisBurgerColors,
        content = content,
    )
}
