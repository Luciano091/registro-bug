package br.com.ritmesa.bisburger.data.model

import com.google.gson.annotations.SerializedName

data class DeliveryArea(
    val id: Long,
    @SerializedName("bairro") val neighborhood: String,
    @SerializedName("taxa") val fee: Double,
    @SerializedName("pedido_minimo") val minimumOrder: Double = 0.0,
    @SerializedName("prazo_adicional_min") val additionalMinutes: Int = 0,
)

data class DeliveryConfig(
    @SerializedName("entrega_habilitada") val enabled: Boolean,
    @SerializedName("entrega_modo") val mode: String,
    @SerializedName("taxa_fixa") val fixedFee: Double = 0.0,
    @SerializedName("pedido_minimo") val minimumOrder: Double = 0.0,
    @SerializedName("areas") val areas: List<DeliveryArea> = emptyList(),
)

data class DeliveryQuoteRequest(
    @SerializedName("subtotal") val subtotal: Double,
    @SerializedName("bairro") val neighborhood: String? = null,
    @SerializedName("latitude_entrega") val latitude: Double? = null,
    @SerializedName("longitude_entrega") val longitude: Double? = null,
)

data class DeliveryQuote(
    @SerializedName("atendido") val available: Boolean,
    @SerializedName("taxa") val fee: Double = 0.0,
    @SerializedName("pedido_minimo") val minimumOrder: Double = 0.0,
    @SerializedName("faltam_para_minimo") val missingForMinimum: Double = 0.0,
    @SerializedName("distancia_km") val distanceKm: Double? = null,
    @SerializedName("prazo_estimado_min") val estimatedMinutes: Int? = null,
    @SerializedName("mensagem") val message: String,
)

data class OrderOptionRequest(
    @SerializedName("opcao_id") val optionId: Long,
    @SerializedName("quantidade") val quantity: Int,
)

data class OrderItemRequest(
    @SerializedName("produto_id") val productId: Long,
    @SerializedName("quantidade") val quantity: Int,
    @SerializedName("observacao") val note: String? = null,
    @SerializedName("opcoes") val options: List<OrderOptionRequest> = emptyList(),
)

data class CreateOrderRequest(
    val uuid: String,
    @SerializedName("cliente") val customerName: String,
    @SerializedName("telefone") val phone: String,
    @SerializedName("endereco") val address: String? = null,
    @SerializedName("bairro") val neighborhood: String? = null,
    @SerializedName("latitude_entrega") val latitude: Double? = null,
    @SerializedName("longitude_entrega") val longitude: Double? = null,
    @SerializedName("tipo_entrega") val deliveryType: String,
    @SerializedName("forma_pagamento") val paymentMethod: String,
    @SerializedName("observacao") val note: String? = null,
    @SerializedName("cashback_usado") val cashbackUsed: Double = 0.0,
    @SerializedName("cupom_codigo") val couponCode: String? = null,
    @SerializedName("itens") val items: List<OrderItemRequest>,
)

data class CreatedOrder(
    val id: Long,
    val uuid: String,
    @SerializedName("numero") val number: String,
    val status: String,
    val total: Double,
)

data class TrackedOrderOption(
    val id: Long,
    @SerializedName("opcao_nome") val name: String,
    @SerializedName("quantidade") val quantity: Int,
)

data class TrackedOrderItem(
    val id: Long,
    @SerializedName("quantidade") val quantity: Int,
    @SerializedName("produto_nome") val productName: String? = null,
    val subtotal: Double,
    @SerializedName("opcoes") val options: List<TrackedOrderOption> = emptyList(),
)

data class DeliveryDriver(
    val id: Long,
    @SerializedName("nome") val name: String,
    @SerializedName("veiculo") val vehicle: String? = null,
)

data class OrderDelivery(
    val status: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("localizacao_atualizada_em") val locationUpdatedAt: String? = null,
    @SerializedName("entregador") val driver: DeliveryDriver? = null,
)

data class TrackedOrder(
    val id: Long,
    val uuid: String? = null,
    @SerializedName("numero") val number: String,
    val status: String,
    @SerializedName("tipo_entrega") val deliveryType: String,
    @SerializedName("telefone") val phone: String? = null,
    val total: Double,
    @SerializedName("data") val date: String,
    @SerializedName("itens") val items: List<TrackedOrderItem> = emptyList(),
    @SerializedName("entrega") val delivery: OrderDelivery? = null,
)
