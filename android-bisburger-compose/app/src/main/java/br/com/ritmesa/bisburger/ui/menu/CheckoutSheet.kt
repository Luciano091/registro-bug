package br.com.ritmesa.bisburger.ui.menu

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.ritmesa.bisburger.cart.CartItem
import br.com.ritmesa.bisburger.data.model.CreatedOrder
import br.com.ritmesa.bisburger.data.model.DeliveryConfig
import br.com.ritmesa.bisburger.data.model.DeliveryQuote
import br.com.ritmesa.bisburger.data.network.CustomerProfile
import br.com.ritmesa.bisburger.ui.theme.Orange
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutSheet(
    items: List<CartItem>,
    customer: CustomerProfile?,
    deliveryConfig: DeliveryConfig?,
    configLoading: Boolean,
    quote: DeliveryQuote?,
    quoteLoading: Boolean,
    submitting: Boolean,
    createdOrder: CreatedOrder?,
    error: String?,
    couponCode: String = "",
    couponDiscount: Double = 0.0,
    couponError: String? = null,
    couponLoading: Boolean = false,
    useCashback: Boolean = false,
    onApplyCoupon: (String) -> Unit = {},
    onRemoveCoupon: () -> Unit = {},
    onToggleCashback: (Boolean) -> Unit = {},
    onDismiss: () -> Unit,
    onQuoteDelivery: (String?) -> Unit,
    onQuoteDeliveryWithLocation: (Double, Double) -> Unit,
    onClearDeliveryQuote: () -> Unit,
    onSubmit: (String, String, Boolean, String, String, String, Double?, Double?) -> Unit,
) {
    var name by remember { mutableStateOf(customer?.nome.orEmpty()) }
    var phone by remember { mutableStateOf(customer?.telefone.orEmpty()) }
    var address by remember { mutableStateOf(customer?.endereco.orEmpty()) }
    var neighborhood by remember { mutableStateOf("") }
    var delivery by remember { mutableStateOf(true) }
    var paymentMethod by remember { mutableStateOf("") }

    var currentLat by remember { mutableStateOf<Double?>(null) }
    var currentLon by remember { mutableStateOf<Double?>(null) }
    val context = LocalContext.current
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions.getOrDefault(Manifest.permission.ACCESS_FINE_LOCATION, false) ||
            permissions.getOrDefault(Manifest.permission.ACCESS_COARSE_LOCATION, false)) {
            @SuppressLint("MissingPermission")
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    currentLat = location.latitude
                    currentLon = location.longitude
                    onQuoteDeliveryWithLocation(location.latitude, location.longitude)
                }
            }
        }
    }


    LaunchedEffect(deliveryConfig?.enabled) {
        if (deliveryConfig?.enabled == false) delivery = false
    }
    LaunchedEffect(delivery, deliveryConfig?.mode, neighborhood, items.sumOf { it.total }) {
        if (!delivery) {
            onClearDeliveryQuote()
        } else if (deliveryConfig != null) {
            onQuoteDelivery(neighborhood.takeIf { it.isNotBlank() })
        }
    }

    val subtotal = items.sumOf { it.total }
    val deliveryFee = if (delivery && quote?.available == true) quote.fee else 0.0
    val cashbackDiscount = if (useCashback) (customer?.saldo_cashback ?: 0.0) else 0.0
    val total = (subtotal + deliveryFee - couponDiscount - cashbackDiscount).coerceAtLeast(0.0)
    val valid = name.isNotBlank() &&
        phone.count(Char::isDigit) >= 10 &&
        paymentMethod.isNotBlank() &&
        !configLoading &&
        (!delivery || (address.isNotBlank() && quote?.available == true && !quoteLoading))
    val pendingRequirement = when {
        name.isBlank() -> "Informe seu nome para continuar."
        phone.count(Char::isDigit) < 10 -> "Informe um WhatsApp válido com DDD."
        delivery && address.isBlank() -> "Informe o endereço da entrega."
        delivery && quoteLoading -> "Aguarde o cálculo da entrega."
        delivery && quote?.available != true -> "Confirme uma área de entrega disponível."
        paymentMethod.isBlank() -> "Escolha a forma de pagamento."
        else -> null
    }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        dragHandle = null,
    ) {
        if (createdOrder != null) {
            OrderSuccess(createdOrder, onDismiss)
            return@ModalBottomSheet
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.94f)
                .imePadding()
                .navigationBarsPadding(),
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp),
            ) {
                Text("Finalizar pedido", fontSize = 24.sp, fontWeight = FontWeight.Black)
                Text(
                    "Pagamento feito diretamente ao estabelecimento.",
                    color = Color(0xFF71717A),
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 2.dp, bottom = 12.dp),
                )

            OutlinedTextField(
                value = name,
                onValueChange = { name = it.take(120) },
                label = { Text("Nome") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = phone,
                onValueChange = { next -> phone = next.filter(Char::isDigit).take(11) },
                label = { Text("WhatsApp com DDD") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            Text("Como deseja receber?", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 18.dp))
            Row(
                modifier = Modifier.padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                ChoiceCard(
                    text = "Entrega",
                    selected = delivery,
                    enabled = deliveryConfig?.enabled != false,
                    onClick = { delivery = true },
                    modifier = Modifier.weight(1f),
                )
                ChoiceCard(
                    text = "Retirada",
                    selected = !delivery,
                    enabled = true,
                    onClick = { delivery = false },
                    modifier = Modifier.weight(1f),
                )
            }

            if (configLoading) {
                Row(Modifier.padding(top = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(Modifier.height(18.dp), strokeWidth = 2.dp)
                    Text("Carregando regras de entrega…", Modifier.padding(start = 10.dp), fontSize = 13.sp)
                }
            }

            if (delivery) {
                if (deliveryConfig?.mode == "bairro") {
                    Text("Bairro", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 16.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp), modifier = Modifier.padding(top = 8.dp)) {
                        deliveryConfig.areas.forEach { area ->
                            ChoiceCard(
                                text = "${area.neighborhood} · ${if (area.fee == 0.0) "grátis" else money(area.fee)}",
                                selected = neighborhood == area.neighborhood,
                                enabled = true,
                                onClick = { neighborhood = area.neighborhood },
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it.take(300) },
                    label = { Text("Endereço, número e referência") },
                    minLines = 1,
                    maxLines = 2,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                )

                when {
                    deliveryConfig?.mode == "distancia" -> {
                        Button(
                            onClick = {
                                if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                                    @SuppressLint("MissingPermission")
                                    fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                                        if (location != null) {
                                            currentLat = location.latitude
                                            currentLon = location.longitude
                                            onQuoteDeliveryWithLocation(location.latitude, location.longitude)
                                        }
                                    }
                                } else {
                                    locationPermissionLauncher.launch(
                                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                                    )
                                }
                            },
                            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                        ) {
                            Text("Calcular taxa por distância (Requer GPS)")
                        }
                        if (quoteLoading) {
                            StatusBox("Calculando taxa e área de atendimento...", success = null)
                        } else if (quote != null) {
                            StatusBox(
                                "${quote.message}${if (quote.available) " Taxa: ${money(quote.fee)}." else ""}",
                                success = quote.available,
                            )
                        }
                    }
                    quoteLoading -> StatusBox("Calculando taxa e área de atendimento…", success = null)
                    quote != null -> StatusBox(
                        "${quote.message}${if (quote.available) " Taxa: ${money(quote.fee)}." else ""}",
                        success = quote.available,
                    )
                }
            }

            // --- CUPOM E CASHBACK ---
            Text("Cupons e Cashback", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 18.dp))
            var typedCoupon by remember { mutableStateOf("") }
            
            if (couponCode.isNotBlank() && couponDiscount > 0) {
                StatusBox("Cupom $couponCode aplicado! Desconto de ${money(couponDiscount)}", success = true)
                Text(
                    "Remover cupom", 
                    color = Color.Red, 
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp).clickable { onRemoveCoupon() }
                )
            } else {
                Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = typedCoupon,
                        onValueChange = { typedCoupon = it.take(20).uppercase() },
                        label = { Text("Código do cupom") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    Button(
                        onClick = { onApplyCoupon(typedCoupon) },
                        enabled = typedCoupon.isNotBlank() && !couponLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = Orange),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.heightIn(min = 54.dp)
                    ) {
                        Text(if (couponLoading) "..." else "Aplicar")
                    }
                }
                couponError?.let { StatusBox(it, success = false) }
            }

            if (customer != null && customer.saldo_cashback > 0) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp).background(Color(0xFFFFF7ED), RoundedCornerShape(12.dp)).clickable { onToggleCashback(!useCashback) }.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    androidx.compose.material3.Checkbox(
                        checked = useCashback,
                        onCheckedChange = { onToggleCashback(it) },
                        colors = androidx.compose.material3.CheckboxDefaults.colors(checkedColor = Orange)
                    )
                    Column {
                        Text("Usar saldo de cashback", fontWeight = FontWeight.Bold, color = Orange)
                        Text("Você tem ${money(customer.saldo_cashback)} disponíveis", fontSize = 13.sp, color = Color(0xFF9A3412))
                    }
                }
            }
            // ------------------------

                Text("Forma de pagamento", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 16.dp))
                Text(
                    "Escolha como pagará ao estabelecimento.",
                    color = Color(0xFF71717A),
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 2.dp),
                )
                Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                    listOf("PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro")
                        .chunked(2)
                        .forEach { methods ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                methods.forEach { method ->
                                    ChoiceCard(
                                        text = method,
                                        selected = paymentMethod == method,
                                        enabled = true,
                                        onClick = { paymentMethod = method },
                                        modifier = Modifier
                                            .weight(1f)
                                            .heightIn(min = 48.dp),
                                    )
                                }
                            }
                        }
                }

                error?.let { StatusBox(it, success = false) }

                Text("Resumo do pedido", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 18.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .background(Color(0xFFF8F8FA), RoundedCornerShape(14.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(7.dp),
                ) {
                    SummaryRow("Subtotal", money(subtotal))
                    if (delivery) SummaryRow("Entrega", if (quote?.available == true) money(deliveryFee) else "A calcular")
                    if (couponDiscount > 0) SummaryRow("Cupom", "− ${money(couponDiscount)}", Orange)
                    if (cashbackDiscount > 0) SummaryRow("Cashback", "− ${money(cashbackDiscount)}", Orange)
                }
                Spacer(Modifier.height(16.dp))
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(horizontal = 20.dp, vertical = 12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Total", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(money(total), color = Orange, fontSize = 22.sp, fontWeight = FontWeight.Black)
                }
                HorizontalDivider(
                    modifier = Modifier.padding(top = 8.dp),
                    color = Color(0xFFE4E4E7),
                )
                pendingRequirement?.let {
                    Text(
                        it,
                        color = Color(0xFF71717A),
                        fontSize = 11.sp,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                Button(
                    onClick = { onSubmit(name, phone, delivery, address, neighborhood, paymentMethod, currentLat, currentLon) },
                    enabled = valid && !submitting,
                    colors = ButtonDefaults.buttonColors(containerColor = Orange),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .heightIn(min = 52.dp),
                ) {
                    Text(if (submitting) "Enviando…" else "Enviar pedido", fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun ChoiceCard(
    text: String,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Text(
        text = text,
        color = when {
            !enabled -> Color(0xFFA1A1AA)
            selected -> Color.White
            else -> Color(0xFF3F3F46)
        },
        fontWeight = FontWeight.Bold,
        fontSize = 13.sp,
        textAlign = TextAlign.Center,
        maxLines = 1,
        modifier = modifier
            .background(
                if (selected && enabled) Orange else Color(0xFFF4F4F5),
                RoundedCornerShape(12.dp),
            )
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 13.dp),
    )
}

@Composable
private fun SummaryRow(label: String, value: String, valueColor: Color = Color(0xFF3F3F46)) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = Color(0xFF71717A), fontSize = 13.sp)
        Text(value, color = valueColor, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun StatusBox(message: String, success: Boolean?) {
    val background = when (success) {
        true -> Color(0xFFECFDF5)
        false -> Color(0xFFFEF2F2)
        null -> Color(0xFFF4F4F5)
    }
    val foreground = when (success) {
        true -> Color(0xFF047857)
        false -> Color(0xFFB91C1C)
        null -> Color(0xFF52525B)
    }
    Text(
        message,
        color = foreground,
        fontSize = 12.sp,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
            .background(background, RoundedCornerShape(12.dp))
            .padding(10.dp),
    )
}

@Composable
private fun OrderSuccess(order: CreatedOrder, onDismiss: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("✓", color = Color(0xFF059669), fontSize = 54.sp, fontWeight = FontWeight.Black)
        Text("Pedido recebido!", fontSize = 24.sp, fontWeight = FontWeight.Black)
        Text(
            "Pedido #${order.number.substringAfterLast('-')} salvo para acompanhamento.",
            color = Color(0xFF71717A),
            modifier = Modifier.padding(top = 8.dp),
        )
        Button(
            onClick = onDismiss,
            colors = ButtonDefaults.buttonColors(containerColor = Orange),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp)
                .heightIn(min = 52.dp),
        ) {
            Text("Voltar ao cardápio", fontWeight = FontWeight.Bold)
        }
    }
}

private fun money(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(value)
