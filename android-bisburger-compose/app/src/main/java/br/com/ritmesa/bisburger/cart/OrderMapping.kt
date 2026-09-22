package br.com.ritmesa.bisburger.cart

import br.com.ritmesa.bisburger.data.model.OrderItemRequest
import br.com.ritmesa.bisburger.data.model.OrderOptionRequest

fun List<CartItem>.toOrderItemRequests(): List<OrderItemRequest> = map { item ->
    OrderItemRequest(
        productId = item.productId,
        quantity = item.quantity,
        note = item.note.takeIf { it.isNotBlank() },
        options = item.options.map { option ->
            OrderOptionRequest(option.optionId, option.quantity)
        },
    )
}
