package br.com.ritmesa.bisburger.ui.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.ritmesa.bisburger.cart.SelectedOption
import br.com.ritmesa.bisburger.cart.SelectionValidation
import br.com.ritmesa.bisburger.cart.validateSelection
import br.com.ritmesa.bisburger.data.model.Product
import br.com.ritmesa.bisburger.data.model.ProductOption
import br.com.ritmesa.bisburger.data.model.ProductOptionGroup
import br.com.ritmesa.bisburger.ui.theme.Orange
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductConfiguratorSheet(
    product: Product,
    canOrder: Boolean,
    statusConfirmed: Boolean,
    onDismiss: () -> Unit,
    onAdd: (Product, Int, List<SelectedOption>, String) -> Unit,
) {
    var quantity by remember(product.id) { mutableIntStateOf(1) }
    var selected by remember(product.id) { mutableStateOf<List<SelectedOption>>(emptyList()) }
    var note by remember(product.id) { mutableStateOf("") }
    var error by remember(product.id) { mutableStateOf<String?>(null) }

    val activeGroups = product.optionGroups.filter { it.active }
    val optionTotal = selected.sumOf { it.additionalPrice * it.quantity }
    val total = (product.currentPrice + optionTotal) * quantity

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            Text(product.name, fontSize = 24.sp, fontWeight = FontWeight.Black)
            product.description?.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    color = Color(0xFF71717A),
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
            Text(
                money(product.currentPrice),
                color = Orange,
                fontSize = 19.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier.padding(top = 10.dp, bottom = 16.dp),
            )

            activeGroups.forEach { group ->
                OptionGroup(
                    group = group,
                    selected = selected,
                    onToggle = { option ->
                        error = null
                        selected = toggleOption(selected, group, option)
                    },
                    onChangeQuantity = { optionId, delta ->
                        error = null
                        selected = changeOptionQuantity(selected, group, optionId, delta)
                    },
                )
                Spacer(Modifier.height(14.dp))
            }

            OutlinedTextField(
                value = note,
                onValueChange = { note = it.take(500) },
                label = { Text("Observação") },
                placeholder = { Text("Ex.: sem cebola, carne ao ponto") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth(),
            )

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

            Row(
                modifier = Modifier.padding(top = 18.dp, bottom = 42.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                QuantityControl(
                    quantity = quantity,
                    onDecrease = { quantity = maxOf(1, quantity - 1) },
                    onIncrease = { quantity += 1 },
                )
                Spacer(Modifier.width(12.dp))
                Button(
                    enabled = canOrder && statusConfirmed,
                    onClick = {
                        when (val validation = validateSelection(product, selected)) {
                            SelectionValidation.Valid -> onAdd(product, quantity, selected, note)
                            is SelectionValidation.Invalid -> error = validation.message
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Orange),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 52.dp),
                ) {
                    Text(
                        text = when {
                            !statusConfirmed -> "Aguarde a atualização"
                            !canOrder -> "Loja fechada"
                            else -> "Adicionar • ${money(total)}"
                        },
                        fontWeight = FontWeight.Black,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }
    }
}

@Composable
private fun OptionGroup(
    group: ProductOptionGroup,
    selected: List<SelectedOption>,
    onToggle: (ProductOption) -> Unit,
    onChangeQuantity: (Long, Int) -> Unit,
) {
    val minimum = maxOf(group.minimum, if (group.required) 1 else 0)
    val count = selected.filter { it.groupId == group.id }.sumOf { it.quantity }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFFAFAFA), RoundedCornerShape(16.dp))
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(group.name, fontWeight = FontWeight.Bold)
                Text(
                    if (minimum > 0) "Escolha de $minimum até ${group.maximum}"
                    else "Escolha até ${group.maximum}",
                    color = Color(0xFF71717A),
                    fontSize = 12.sp,
                )
            }
            Text(
                "${if (minimum > 0) "Obrigatório" else "Opcional"} · $count/${group.maximum}",
                color = if (count >= minimum) Color(0xFF047857) else Color(0xFFC2410C),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
            )
        }

        group.options.filter { it.active }.forEachIndexed { index, option ->
            if (index == 0) Spacer(Modifier.height(8.dp)) else HorizontalDivider()
            val selection = selected.find { it.groupId == group.id && it.optionId == option.id }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onToggle(option) }
                    .padding(vertical = 11.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .background(
                            if (selection != null) Orange else Color(0xFFE4E4E7),
                            if (group.maximum == 1) CircleShape else RoundedCornerShape(5.dp),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    if (selection != null) Text("✓", color = Color.White, fontSize = 12.sp)
                }
                Spacer(Modifier.width(10.dp))
                Text(option.name, modifier = Modifier.weight(1f), fontWeight = FontWeight.Medium)
                if (selection != null && group.maximum > 1) {
                    CompactQuantityControl(
                        quantity = selection.quantity,
                        onDecrease = { onChangeQuantity(option.id, -1) },
                        onIncrease = { onChangeQuantity(option.id, 1) },
                    )
                    Spacer(Modifier.width(8.dp))
                }
                Text(
                    if (option.additionalPrice > 0) "+ ${money(option.additionalPrice)}" else "Incluso",
                    color = Color(0xFF71717A),
                    fontSize = 12.sp,
                )
            }
        }
    }
}

@Composable
private fun QuantityControl(
    quantity: Int,
    onDecrease: () -> Unit,
    onIncrease: () -> Unit,
) {
    Row(
        modifier = Modifier.background(Color(0xFFF4F4F5), RoundedCornerShape(14.dp)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("−", Modifier.clickable(onClick = onDecrease).padding(14.dp), fontWeight = FontWeight.Black)
        Text(quantity.toString(), fontWeight = FontWeight.Black)
        Text("+", Modifier.clickable(onClick = onIncrease).padding(14.dp), fontWeight = FontWeight.Black)
    }
}

@Composable
private fun CompactQuantityControl(
    quantity: Int,
    onDecrease: () -> Unit,
    onIncrease: () -> Unit,
) {
    Row(
        modifier = Modifier.background(Color(0xFFE4E4E7), RoundedCornerShape(8.dp)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("−", Modifier.clickable(onClick = onDecrease).padding(7.dp), fontWeight = FontWeight.Bold)
        Text(quantity.toString(), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text("+", Modifier.clickable(onClick = onIncrease).padding(7.dp), fontWeight = FontWeight.Bold)
    }
}

private fun toggleOption(
    selected: List<SelectedOption>,
    group: ProductOptionGroup,
    option: ProductOption,
): List<SelectedOption> {
    val current = selected.find { it.groupId == group.id && it.optionId == option.id }
    if (current != null) return selected - current

    val groupCount = selected.filter { it.groupId == group.id }.sumOf { it.quantity }
    if (group.maximum != 1 && groupCount >= group.maximum) return selected

    val newSelection = SelectedOption(
        optionId = option.id,
        groupId = group.id,
        groupName = group.name,
        name = option.name,
        additionalPrice = option.additionalPrice,
    )
    return if (group.maximum == 1) {
        selected.filterNot { it.groupId == group.id } + newSelection
    } else {
        selected + newSelection
    }
}

private fun changeOptionQuantity(
    selected: List<SelectedOption>,
    group: ProductOptionGroup,
    optionId: Long,
    delta: Int,
): List<SelectedOption> {
    val groupCount = selected.filter { it.groupId == group.id }.sumOf { it.quantity }
    return selected.map { selection ->
        if (selection.groupId != group.id || selection.optionId != optionId) return@map selection
        val next = selection.quantity + delta
        if (next < 1 || groupCount + delta > group.maximum) selection
        else selection.copy(quantity = next)
    }
}

private fun money(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(value)
