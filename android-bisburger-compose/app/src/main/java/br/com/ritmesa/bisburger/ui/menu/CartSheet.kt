package br.com.ritmesa.bisburger.ui.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.ritmesa.bisburger.cart.CartItem
import br.com.ritmesa.bisburger.ui.theme.Orange
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartSheet(
    items: List<CartItem>,
    onDismiss: () -> Unit,
    onChangeQuantity: (String, Int) -> Unit,
    onRemove: (String) -> Unit,
    canCheckout: Boolean,
    onCheckout: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            Text("Seu carrinho", fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text(
                "Revise os produtos antes de finalizar.",
                color = Color(0xFF71717A),
                modifier = Modifier.padding(top = 3.dp, bottom = 14.dp),
            )

            items.forEachIndexed { index, item ->
                if (index > 0) HorizontalDivider()
                CartRow(item, onChangeQuantity, onRemove)
            }

            val total = items.sumOf { it.total }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Subtotal", fontWeight = FontWeight.Bold)
                Text(money(total), color = Orange, fontSize = 20.sp, fontWeight = FontWeight.Black)
            }
            Text(
                "A taxa de entrega será confirmada na próxima etapa.",
                color = Color(0xFF52525B),
                fontSize = 13.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .background(Color(0xFFF4F4F5), RoundedCornerShape(12.dp))
                    .padding(12.dp),
            )
            Button(
                onClick = onCheckout,
                enabled = canCheckout,
                colors = ButtonDefaults.buttonColors(containerColor = Orange),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, bottom = 48.dp)
                    .heightIn(min = 52.dp),
            ) {
                Text(if (canCheckout) "Continuar" else "Loja fechada", fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun CartRow(
    item: CartItem,
    onChangeQuantity: (String, Int) -> Unit,
    onRemove: (String) -> Unit,
) {
    Column(Modifier.padding(vertical = 14.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(item.name, fontWeight = FontWeight.Bold)
                item.options.forEach { option ->
                    Text(
                        "${option.quantity}× ${option.name}",
                        color = Color(0xFF71717A),
                        fontSize = 12.sp,
                    )
                }
                item.note.takeIf { it.isNotBlank() }?.let {
                    Text("Obs.: $it", color = Color(0xFF71717A), fontSize = 12.sp)
                }
            }
            Text(money(item.total), fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Row(
                modifier = Modifier.background(Color(0xFFF4F4F5), RoundedCornerShape(10.dp)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("−", Modifier.clickable { onChangeQuantity(item.id, -1) }.padding(10.dp))
                Text(item.quantity.toString(), fontWeight = FontWeight.Bold)
                Text("+", Modifier.clickable { onChangeQuantity(item.id, 1) }.padding(10.dp))
            }
            Spacer(Modifier.width(14.dp))
            Text(
                "Remover",
                color = Color(0xFFB91C1C),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.clickable { onRemove(item.id) }.padding(vertical = 8.dp),
            )
        }
    }
}

private fun money(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(value)
