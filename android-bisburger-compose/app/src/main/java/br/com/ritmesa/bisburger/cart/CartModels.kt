package br.com.ritmesa.bisburger.cart

import br.com.ritmesa.bisburger.data.model.Product
import java.util.UUID

data class SelectedOption(
    val optionId: Long,
    val groupId: Long,
    val groupName: String,
    val name: String,
    val additionalPrice: Double,
    val quantity: Int = 1,
)

data class CartItem(
    val id: String = UUID.randomUUID().toString(),
    val productId: Long,
    val name: String,
    val basePrice: Double,
    val quantity: Int,
    val options: List<SelectedOption> = emptyList(),
    val note: String = "",
) {
    val unitPrice: Double
        get() = basePrice + options.sumOf { it.additionalPrice * it.quantity }

    val total: Double
        get() = unitPrice * quantity
}

sealed interface SelectionValidation {
    data object Valid : SelectionValidation
    data class Invalid(val message: String) : SelectionValidation
}

fun validateSelection(
    product: Product,
    selectedOptions: List<SelectedOption>,
): SelectionValidation {
    product.optionGroups.filter { it.active }.forEach { group ->
        val minimum = maxOf(group.minimum, if (group.required) 1 else 0)
        val count = selectedOptions
            .filter { it.groupId == group.id }
            .sumOf { it.quantity }

        if (count < minimum) {
            return SelectionValidation.Invalid(
                "Escolha pelo menos $minimum opção(ões) em “${group.name}”.",
            )
        }
        if (count > group.maximum) {
            return SelectionValidation.Invalid(
                "Escolha no máximo ${group.maximum} opção(ões) em “${group.name}”.",
            )
        }
    }
    return SelectionValidation.Valid
}
