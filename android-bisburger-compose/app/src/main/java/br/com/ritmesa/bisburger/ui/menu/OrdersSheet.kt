package br.com.ritmesa.bisburger.ui.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.sp
import br.com.ritmesa.bisburger.data.model.TrackedOrder
import br.com.ritmesa.bisburger.ui.theme.Orange
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersSheet(
    orders: List<TrackedOrder>,
    loading: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onRefresh: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Meus pedidos", fontSize = 24.sp, fontWeight = FontWeight.Black)
                    Text("Acompanhamento salvo neste aparelho", color = Color(0xFF71717A), fontSize = 12.sp)
                }
                Button(
                    onClick = onRefresh,
                    enabled = !loading,
                    colors = ButtonDefaults.buttonColors(containerColor = Orange),
                ) {
                    Text(if (loading) "Atualizando…" else "Atualizar")
                }
            }

            error?.let { OrdersMessage(it, Color(0xFFFEF2F2), Color(0xFFB91C1C)) }
            if (loading && orders.isEmpty()) {
                CircularProgressIndicator(
                    color = Orange,
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .padding(36.dp),
                )
            } else if (orders.isEmpty()) {
                OrdersMessage(
                    "Nenhum pedido salvo neste aparelho.",
                    Color(0xFFF4F4F5),
                    Color(0xFF52525B),
                )
            } else {
                Spacer(Modifier.height(14.dp))
                orders.forEach { order ->
                    OrderCard(order)
                    Spacer(Modifier.height(12.dp))
                }
            }
            Spacer(Modifier.height(48.dp))
        }
    }
}

@Composable
private fun OrderCard(order: TrackedOrder) {
    val delivery = order.deliveryType.lowercase() in setOf("delivery", "entrega")
    val (statusLabel, statusBackground, statusColor) = statusStyle(order.status, delivery)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White, RoundedCornerShape(18.dp))
            .padding(16.dp),
    ) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text(
                    "Pedido #${order.number.substringAfterLast('-')}",
                    fontWeight = FontWeight.Black,
                )
                Text(if (delivery) "Entrega" else "Retirada", color = Color(0xFF71717A), fontSize = 12.sp)
            }
            Text(money(order.total), fontSize = 18.sp, fontWeight = FontWeight.Black)
        }
        Text(
            statusLabel,
            color = statusColor,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .background(statusBackground, RoundedCornerShape(12.dp))
                .padding(11.dp),
        )

        if (!isFinished(order.status)) {
            OrderProgress(order.status, delivery)
        }
        val context = LocalContext.current
        order.delivery?.driver?.let { driver ->
            Text(
                "Entregador: ${driver.name}${driver.vehicle?.let { " · $it" }.orEmpty()}",
                color = Color(0xFF1D4ED8),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 12.dp),
            )
            if (order.status == "Saiu entrega" && order.delivery.latitude != null && order.delivery.longitude != null) {
                Button(
                    onClick = {
                        val uri = Uri.parse("geo:${order.delivery.latitude},${order.delivery.longitude}?q=${order.delivery.latitude},${order.delivery.longitude}(${Uri.encode("Entregador " + driver.name)})")
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEFF6FF), contentColor = Color(0xFF1D4ED8))
                ) {
                    Text("Acompanhar no Mapa", fontWeight = FontWeight.Bold)
                }
            }
        }
        if (order.items.isNotEmpty()) {
            HorizontalDivider(Modifier.padding(vertical = 12.dp))
            order.items.forEach { item ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) {
                        Text("${item.quantity}× ${item.productName ?: "Produto"}", fontSize = 13.sp)
                        item.options.forEach { option ->
                            Text(
                                "${option.quantity}× ${option.name}",
                                color = Color(0xFF71717A),
                                fontSize = 11.sp,
                            )
                        }
                    }
                    Text(money(item.subtotal), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(7.dp))
            }
        }
    }
}

@Composable
private fun OrderProgress(status: String, delivery: Boolean) {
    val stages = if (delivery) 5 else 4
    val rank = when (status) {
        "Em preparo" -> 1
        "Pronto" -> 2
        "Saiu entrega" -> 3
        "Finalizado", "Concluído", "Entregue" -> stages - 1
        else -> 0
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        repeat(stages) { index ->
            Spacer(
                Modifier
                    .weight(1f)
                    .height(6.dp)
                    .background(
                        if (index <= rank) Orange else Color(0xFFE4E4E7),
                        RoundedCornerShape(3.dp),
                    ),
            )
        }
    }
}

@Composable
private fun OrdersMessage(text: String, background: Color, foreground: Color) {
    Text(
        text,
        color = foreground,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 14.dp)
            .background(background, RoundedCornerShape(12.dp))
            .padding(14.dp),
    )
}

private fun statusStyle(status: String, delivery: Boolean): Triple<String, Color, Color> = when (status) {
    "Novo", "Recebido" -> Triple("Pedido recebido", Color(0xFFFFF7ED), Color(0xFFC2410C))
    "Em preparo" -> Triple("Em preparo", Color(0xFFFFFBEB), Color(0xFFB45309))
    "Pronto" -> Triple(if (delivery) "Pronto para entrega" else "Pronto para retirada", Color(0xFFECFDF5), Color(0xFF047857))
    "Saiu entrega" -> Triple("Saiu para entrega", Color(0xFFEFF6FF), Color(0xFF1D4ED8))
    "Finalizado", "Concluído", "Entregue" -> Triple("Pedido concluído", Color(0xFFECFDF5), Color(0xFF047857))
    "Cancelado" -> Triple("Pedido cancelado", Color(0xFFFEF2F2), Color(0xFFB91C1C))
    else -> Triple(status, Color(0xFFF4F4F5), Color(0xFF52525B))
}

private fun isFinished(status: String): Boolean =
    status in setOf("Finalizado", "Concluído", "Entregue", "Cancelado")

private fun money(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(value)
