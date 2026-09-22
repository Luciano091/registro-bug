package br.com.ritmesa.bisburger.data.network

import br.com.ritmesa.bisburger.data.model.Category
import br.com.ritmesa.bisburger.data.model.CreateOrderRequest
import br.com.ritmesa.bisburger.data.model.CreatedOrder
import br.com.ritmesa.bisburger.data.model.DeliveryConfig
import br.com.ritmesa.bisburger.data.model.DeliveryQuote
import br.com.ritmesa.bisburger.data.model.DeliveryQuoteRequest
import br.com.ritmesa.bisburger.data.model.Product
import br.com.ritmesa.bisburger.data.model.StoreConfig
import br.com.ritmesa.bisburger.data.model.TrackedOrder
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Path

data class PushTokenRequest(
    val token: String,
    val plataforma: String = "android",
    val app_version: String,
)

data class GoogleAuthRequest(val token: String)

data class CustomerProfile(
    val id: Long,
    val nome: String,
    val email: String,
    val foto_url: String? = null,
    val saldo_cashback: Double = 0.0,
    val telefone: String? = null,
    val endereco: String? = null,
)

data class GoogleAuthResponse(
    val token: String,
    val cliente: CustomerProfile,
)


data class CouponValidateRequest(
    val codigo: String,
    val subtotal: Double
)

data class CouponValidateResponse(
    val codigo: String,
    val desconto: Double,
    val total: Double,
    val descricao: String
)

data class HighlightCouponResponse(
    val codigo: String,
    val descricao: String? = null,
    val pedido_minimo: Double = 0.0,
    val tipo: String,
    val valor: Double,
)

interface BisBurgerApi {
    @GET("public/bisburger/cupons/destaque")
    suspend fun getHighlightCoupon(): HighlightCouponResponse?

    @POST("public/bisburger/cupons/validar")
    suspend fun validateCoupon(@Body request: CouponValidateRequest): CouponValidateResponse

    @GET("clientes/me")
    suspend fun getCustomerProfile(@Header("Authorization") authorization: String): CustomerProfile

    @POST("auth/google")
    suspend fun authenticateWithGoogle(@Body request: GoogleAuthRequest): GoogleAuthResponse

    @GET("public/bisburger/configuracao")
    suspend fun getConfig(): StoreConfig

    @GET("public/bisburger/produtos")
    suspend fun getProducts(): List<Product>

    @GET("public/bisburger/categorias")
    suspend fun getCategories(): List<Category>

    @GET("public/bisburger/entrega/configuracao")
    suspend fun getDeliveryConfig(): DeliveryConfig

    @POST("public/bisburger/entrega/cotar")
    suspend fun quoteDelivery(@Body request: DeliveryQuoteRequest): DeliveryQuote

    @POST("public/bisburger/pedidos")
    suspend fun createOrder(
        @Header("Authorization") authorization: String?,
        @Body request: CreateOrderRequest,
    ): CreatedOrder

    @GET("public/bisburger/acompanhamento/{code}")
    suspend fun getTrackedOrder(@Path("code") code: String): TrackedOrder

    @PUT("clientes/push")
    suspend fun registerCustomerPushToken(
        @Header("Authorization") authorization: String,
        @Body request: PushTokenRequest,
    ): Response<Unit>
}
