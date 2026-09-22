package br.com.ritmesa.bisburger.ui.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.ritmesa.bisburger.data.network.CustomerProfile
import br.com.ritmesa.bisburger.ui.theme.Orange
import coil.compose.AsyncImage
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountSheet(
    customer: CustomerProfile?,
    loading: Boolean,
    error: String?,
    notificationStatus: String,
    onDismiss: () -> Unit,
    onGoogleSignIn: () -> Unit,
    onSignOut: () -> Unit,
    onRetryNotifications: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            Text(
                if (customer == null) "Entrar" else "Minha conta",
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
            )
            if (customer == null) {
                Text(
                    "Entre para acompanhar pedidos e receber atualizações da entrega.",
                    color = Color(0xFF71717A),
                    modifier = Modifier.padding(top = 6.dp, bottom = 18.dp),
                )
                Button(
                    onClick = onGoogleSignIn,
                    enabled = !loading,
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFF18181B)),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                ) {
                    Text(if (loading) "Conectando…" else "Continuar com Google", fontWeight = FontWeight.Bold)
                }
                error?.let {
                    Text(
                        text = it,
                        color = Color(0xFFB91C1C),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp)
                            .background(Color(0xFFFEF2F2), RoundedCornerShape(12.dp))
                            .padding(12.dp),
                    )
                }
            } else {
                Row(
                    modifier = Modifier.padding(top = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AsyncImage(
                        model = customer.foto_url,
                        contentDescription = "Foto de ${customer.nome}",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(58.dp)
                            .background(Color(0xFFFFF7ED), RoundedCornerShape(16.dp)),
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(customer.nome, fontWeight = FontWeight.Black, fontSize = 18.sp)
                        Text(customer.email, color = Color(0xFF71717A), fontSize = 13.sp)
                    }
                }
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 18.dp)
                        .background(Color(0xFFFFFBEB), RoundedCornerShape(16.dp))
                        .padding(16.dp),
                ) {
                    Text("Meu cashback", color = Color(0xFF92400E), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(money(customer.saldo_cashback), color = Orange, fontSize = 24.sp, fontWeight = FontWeight.Black)
                }
                val notificationsActive = notificationStatus == "Notificações ativas"
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .background(
                            if (notificationsActive) Color(0xFFECFDF5) else Color(0xFFFFF7ED),
                            RoundedCornerShape(16.dp),
                        )
                        .padding(14.dp),
                ) {
                    Text(
                        "Notificações de entrega",
                        fontWeight = FontWeight.Bold,
                        color = if (notificationsActive) Color(0xFF047857) else Color(0xFF9A3412),
                    )
                    Text(
                        notificationStatus,
                        color = Color(0xFF52525B),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 3.dp),
                    )
                    if (!notificationsActive) {
                        OutlinedButton(
                            onClick = onRetryNotifications,
                            modifier = Modifier.padding(top = 8.dp),
                        ) {
                            Text("Tentar novamente")
                        }
                    }
                }
                OutlinedButton(
                    onClick = onSignOut,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 18.dp),
                ) {
                    Text("Sair da conta")
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

private fun money(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(value)
