package br.com.ritmesa.bisburger.ui.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.ritmesa.bisburger.data.network.HighlightCouponResponse
import br.com.ritmesa.bisburger.ui.theme.Orange
import java.text.NumberFormat
import java.util.Locale

@Composable
fun CouponPromoDialog(
    coupon: HighlightCouponResponse,
    onDismiss: () -> Unit,
    onUseCoupon: () -> Unit,
) {
    val discount = if (coupon.tipo == "percentual") {
        "${formatNumber(coupon.valor)}% de desconto"
    } else {
        "${promoMoney(coupon.valor)} de desconto"
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(26.dp),
        containerColor = Color.White,
        icon = {
            Icon(
                imageVector = Icons.Outlined.ConfirmationNumber,
                contentDescription = null,
                tint = Orange,
                modifier = Modifier
                    .size(64.dp)
                    .background(Color(0xFFFFE8D6), CircleShape)
                    .padding(14.dp),
            )
        },
        title = {
            Text(
                text = "Cupom ativo!",
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
            )
        },
        text = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "Aproveite $discount no seu pedido.",
                    color = Color(0xFF52525B),
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = coupon.codigo,
                    color = Color(0xFF9A3412),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFFFF1E8), RoundedCornerShape(14.dp))
                        .padding(vertical = 12.dp),
                    textAlign = TextAlign.Center,
                )
                coupon.descricao?.takeIf { it.isNotBlank() }?.let {
                    Text(it, color = Color(0xFF71717A), textAlign = TextAlign.Center, fontSize = 13.sp)
                }
                if (coupon.pedido_minimo > 0) {
                    Text(
                        "Pedido mínimo: ${promoMoney(coupon.pedido_minimo)}",
                        color = Color(0xFF71717A),
                        fontSize = 12.sp,
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onUseCoupon,
                colors = ButtonDefaults.buttonColors(containerColor = Orange),
            ) {
                Text("Usar este cupom", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Agora não", color = Color(0xFF71717A))
            }
        },
    )
}

private fun formatNumber(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else value.toString().replace('.', ',')

private fun promoMoney(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(value)
