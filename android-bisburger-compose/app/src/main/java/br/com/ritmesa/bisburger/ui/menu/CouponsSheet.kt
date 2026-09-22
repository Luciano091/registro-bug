package br.com.ritmesa.bisburger.ui.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.ritmesa.bisburger.ui.theme.Orange
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CouponsSheet(
    cartTotal: Double,
    appliedCode: String,
    suggestedCode: String = "",
    discount: Double,
    loading: Boolean,
    error: String?,
    onApply: (String) -> Unit,
    onRemove: () -> Unit,
    onDismiss: () -> Unit,
) {
    var code by remember(appliedCode, suggestedCode) {
        mutableStateOf(appliedCode.ifBlank { suggestedCode })
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.ConfirmationNumber, contentDescription = null, tint = Orange)
                Spacer(Modifier.width(10.dp))
                Text("Cupons", fontSize = 24.sp, fontWeight = FontWeight.Black)
            }
            Text(
                "Digite seu código e confira o desconto antes de finalizar.",
                color = Color(0xFF71717A),
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 6.dp, bottom = 16.dp),
            )

            if (appliedCode.isNotBlank()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFECFDF5), RoundedCornerShape(16.dp))
                        .padding(16.dp),
                ) {
                    Text(appliedCode, color = Color(0xFF047857), fontWeight = FontWeight.Black)
                    Text(
                        "Desconto aplicado: ${money(discount)}",
                        color = Color(0xFF047857),
                        fontSize = 13.sp,
                    )
                }
                OutlinedButton(
                    onClick = onRemove,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                ) {
                    Text("Remover cupom")
                }
            } else {
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it.uppercase().take(40) },
                    label = { Text("Código do cupom") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                error?.let {
                    Text(
                        it,
                        color = Color(0xFFB91C1C),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                if (cartTotal <= 0) {
                    Text(
                        "Adicione um produto ao carrinho para validar o desconto.",
                        color = Color(0xFF92400E),
                        fontSize = 13.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp)
                            .background(Color(0xFFFFF7ED), RoundedCornerShape(12.dp))
                            .padding(12.dp),
                    )
                }
                Button(
                    onClick = { onApply(code.trim()) },
                    enabled = code.isNotBlank() && cartTotal > 0 && !loading,
                    colors = ButtonDefaults.buttonColors(containerColor = Orange),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 14.dp)
                        .height(52.dp),
                ) {
                    Text(if (loading) "Validando…" else "Aplicar cupom", fontWeight = FontWeight.Bold)
                }
            }

            Text(
                "Ganhe 2% de cashback nos pedidos confirmados.",
                color = Color(0xFF9A3412),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 18.dp, bottom = 24.dp)
                    .background(Color(0xFFFFF1D6), RoundedCornerShape(14.dp))
                    .padding(14.dp),
            )
        }
    }
}

private fun money(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(value)
