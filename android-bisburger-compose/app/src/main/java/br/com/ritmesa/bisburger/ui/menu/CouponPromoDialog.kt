package br.com.ritmesa.bisburger.ui.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
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
import androidx.compose.ui.window.Dialog
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

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            tonalElevation = 6.dp,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 22.dp, vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
            Icon(
                imageVector = Icons.Outlined.ConfirmationNumber,
                contentDescription = null,
                tint = Orange,
                modifier = Modifier
                    .size(48.dp)
                    .background(Color(0xFFFFE8D6), CircleShape)
                    .padding(11.dp),
            )
            Text(
                text = "Cupom ativo!",
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "Aproveite $discount no seu pedido.",
                color = Color(0xFF52525B),
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
            )
            Text(
                text = coupon.codigo,
                color = Color(0xFF9A3412),
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.2.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFFFF1E8), RoundedCornerShape(12.dp))
                    .padding(vertical = 9.dp),
                textAlign = TextAlign.Center,
            )
            coupon.descricao?.takeIf { it.isNotBlank() }?.let {
                Text(it, color = Color(0xFF71717A), textAlign = TextAlign.Center, fontSize = 12.sp)
            }
            if (coupon.pedido_minimo > 0) {
                Text(
                    "Pedido mínimo: ${promoMoney(coupon.pedido_minimo)}",
                    color = Color(0xFF71717A),
                    fontSize = 12.sp,
                )
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Agora não", color = Color(0xFF71717A), fontSize = 13.sp)
                }
                Button(
                    onClick = onUseCoupon,
                    colors = ButtonDefaults.buttonColors(containerColor = Orange),
                    modifier = Modifier.weight(1.65f),
                ) {
                    Text("Usar cupom", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
            }
        }
    }
}

private fun formatNumber(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else value.toString().replace('.', ',')

private fun promoMoney(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(value)
