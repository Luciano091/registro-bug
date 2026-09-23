package br.com.ritmesa.bisburger.data.orders

import br.com.ritmesa.bisburger.data.auth.CustomerSessionStore
import br.com.ritmesa.bisburger.data.model.CreateOrderRequest
import br.com.ritmesa.bisburger.data.model.CreatedOrder
import br.com.ritmesa.bisburger.data.model.DeliveryConfig
import br.com.ritmesa.bisburger.data.model.DeliveryQuote
import br.com.ritmesa.bisburger.data.model.DeliveryQuoteRequest
import br.com.ritmesa.bisburger.data.model.TrackedOrder
import br.com.ritmesa.bisburger.data.network.BisBurgerApi
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

class OrderRepository(
    private val api: BisBurgerApi,
    private val sessionStore: CustomerSessionStore,
    private val orderStore: OrderStore,
) {
    suspend fun highlightCoupon() = api.getHighlightCoupon()

    suspend fun deliveryConfig(): DeliveryConfig = api.getDeliveryConfig()

    suspend fun quoteDelivery(request: DeliveryQuoteRequest): DeliveryQuote =
        api.quoteDelivery(request)

    suspend fun createOrder(request: CreateOrderRequest): CreatedOrder {
        val authorization = sessionStore.customerToken()?.let { "Bearer $it" }
        val order = api.createOrder(authorization, request)
        orderStore.addTrackingCode(order.uuid)
        return order
    }

    
    suspend fun validateCoupon(code: String, subtotal: Double) =
        api.validateCoupon(br.com.ritmesa.bisburger.data.network.CouponValidateRequest(code, subtotal))

    fun trackingCodes(): List<String> = orderStore.trackingCodes()

    suspend fun trackedOrders(): List<TrackedOrder> = coroutineScope {
        val authorization = sessionStore.customerToken()?.let { "Bearer $it" }
        val accountOrders = async {
            if (authorization == null) emptyList()
            else runCatching { api.getCustomerOrders(authorization) }.getOrDefault(emptyList())
        }
        val localOrders = trackingCodes()
            .map { code -> async { runCatching { api.getTrackedOrder(code) }.getOrNull() } }
            .awaitAll()
            .filterNotNull()
        (accountOrders.await() + localOrders)
            .distinctBy { it.id }
            .sortedByDescending { it.date }
    }

    suspend fun lastKnownLocalPhone(): String? = coroutineScope {
        trackingCodes()
            .map { code -> async { runCatching { api.getTrackedOrder(code) }.getOrNull() } }
            .awaitAll()
            .filterNotNull()
            .sortedByDescending { it.date }
            .firstNotNullOfOrNull { it.phone?.filter(Char::isDigit)?.takeIf { phone -> phone.length >= 10 } }
    }
}
