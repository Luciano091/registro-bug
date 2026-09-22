package br.com.ritmesa.bisburger.ui.menu

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import br.com.ritmesa.bisburger.BisBurgerApplication
import br.com.ritmesa.bisburger.cart.CartItem
import br.com.ritmesa.bisburger.cart.SelectedOption
import br.com.ritmesa.bisburger.cart.toOrderItemRequests
import br.com.ritmesa.bisburger.data.model.CatalogSnapshot
import br.com.ritmesa.bisburger.data.model.Product
import br.com.ritmesa.bisburger.data.model.CreateOrderRequest
import br.com.ritmesa.bisburger.data.model.CreatedOrder
import br.com.ritmesa.bisburger.data.model.DeliveryConfig
import br.com.ritmesa.bisburger.data.model.DeliveryQuote
import br.com.ritmesa.bisburger.data.model.DeliveryQuoteRequest
import br.com.ritmesa.bisburger.data.model.TrackedOrder
import br.com.ritmesa.bisburger.data.network.CustomerProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import java.util.UUID

data class MenuUiState(
    val catalog: CatalogSnapshot? = null,
    val selectedCategory: String = "Todos",
    val refreshing: Boolean = true,
    val storeStatusConfirmed: Boolean = false,
    val selectedProduct: Product? = null,
    val cartItems: List<CartItem> = emptyList(),
    val cartVisible: Boolean = false,
    val accountVisible: Boolean = false,
    val customer: CustomerProfile? = null,
    val loginLoading: Boolean = false,
    val loginError: String? = null,
    val checkoutVisible: Boolean = false,
    val deliveryConfig: DeliveryConfig? = null,
    val deliveryConfigLoading: Boolean = false,
    val deliveryQuote: DeliveryQuote? = null,
    val deliveryQuoteLoading: Boolean = false,
    val orderSubmitting: Boolean = false,
    val createdOrder: CreatedOrder? = null,
    val checkoutError: String? = null,
    val ordersVisible: Boolean = false,
    val ordersLoading: Boolean = false,
    val orders: List<TrackedOrder> = emptyList(),
    val ordersError: String? = null,
    val couponCode: String = "",
    val couponDiscount: Double = 0.0,
    val couponError: String? = null,
    val couponLoading: Boolean = false,
    val useCashback: Boolean = false,
    val pushRegistrationStatus: String = "Verificando notificações…",
    val error: String? = null,
)

class MenuViewModel(application: Application) : AndroidViewModel(application) {
    private val bisBurgerApplication = application as BisBurgerApplication
    private val repository = bisBurgerApplication.catalogRepository
    private val authRepository = bisBurgerApplication.customerAuthRepository
    private val orderRepository = bisBurgerApplication.orderRepository
    private val cart = bisBurgerApplication.cart
    private var quoteJob: Job? = null
    private val _state = MutableStateFlow(MenuUiState())
    val state: StateFlow<MenuUiState> = _state.asStateFlow()

    init {
        _state.update { it.copy(customer = authRepository.currentCustomer()) }
        viewModelScope.launch {
            repository.catalog.collect { cached ->
                if (cached != null) {
                    _state.update { it.copy(catalog = cached, error = null) }
                }
            }
        }
        viewModelScope.launch {
            cart.items.collect { items ->
                _state.update { it.copy(cartItems = items) }
            }
        }
        viewModelScope.launch {
            bisBurgerApplication.pushRegistrationStatus.collect { status ->
                _state.update { it.copy(pushRegistrationStatus = status) }
            }
        }
        refresh()
    }

    fun selectCategory(category: String) {
        _state.update { it.copy(selectedCategory = category) }
    }

    fun selectProduct(product: Product) {
        _state.update { it.copy(selectedProduct = product) }
    }

    fun dismissProduct() {
        _state.update { it.copy(selectedProduct = null) }
    }

    fun addToCart(
        product: Product,
        quantity: Int,
        options: List<SelectedOption>,
        note: String,
    ) {
        cart.add(
            CartItem(
                productId = product.id,
                name = product.name,
                basePrice = product.currentPrice,
                quantity = quantity,
                options = options,
                note = note.trim(),
            ),
        )
        _state.update { it.copy(selectedProduct = null) }
    }

    fun showCart() {
        _state.update { it.copy(cartVisible = true) }
    }

    fun dismissCart() {
        _state.update { it.copy(cartVisible = false) }
    }

    fun changeCartQuantity(itemId: String, delta: Int) {
        cart.updateQuantity(itemId, delta)
    }

    fun removeCartItem(itemId: String) {
        cart.remove(itemId)
        if (cart.items.value.isEmpty()) dismissCart()
    }

    fun showAccount() {
        _state.update { it.copy(accountVisible = true, loginError = null) }
    }

    fun dismissAccount() {
        if (!_state.value.loginLoading) {
            _state.update { it.copy(accountVisible = false, loginError = null) }
        }
    }

    fun signInWithGoogleToken(idToken: String) {
        viewModelScope.launch {
            _state.update { it.copy(loginLoading = true, loginError = null) }
            runCatching { authRepository.signInWithGoogle(idToken) }
                .onSuccess { customer ->
                    _state.update {
                        it.copy(customer = customer, loginLoading = false, loginError = null)
                    }
                }
                .onFailure {
                    _state.update {
                        it.copy(
                            loginLoading = false,
                            loginError = "Não foi possível entrar com Google. Tente novamente.",
                        )
                    }
                }
        }
    }

    fun startGoogleSignIn() {
        _state.update { it.copy(loginLoading = true, loginError = null) }
    }

    fun reportGoogleCredentialError() {
        _state.update {
            it.copy(loginLoading = false, loginError = "O acesso Google foi cancelado ou não pôde ser concluído.")
        }
    }

    fun signOut() {
        authRepository.signOut()
        _state.update { it.copy(customer = null, loginError = null) }
    }

    fun retryNotifications() {
        bisBurgerApplication.registerPushToken()
    }

    fun showCheckout() {
        val current = _state.value
        if (!current.storeStatusConfirmed || current.catalog?.config?.isOpen != true) return
        _state.update {
            it.copy(
                cartVisible = false,
                checkoutVisible = true,
                deliveryConfigLoading = true,
                deliveryQuote = null,
                createdOrder = null,
                checkoutError = null,
            )
        }
        viewModelScope.launch {
            runCatching { orderRepository.deliveryConfig() }
                .onSuccess { config ->
                    _state.update {
                        it.copy(deliveryConfig = config, deliveryConfigLoading = false)
                    }
                }
                .onFailure {
                    _state.update {
                        it.copy(
                            deliveryConfigLoading = false,
                            checkoutError = "Não foi possível carregar as regras de entrega.",
                        )
                    }
                }
        }
    }

    fun dismissCheckout() {
        if (_state.value.orderSubmitting) return
        quoteJob?.cancel()
        _state.update {
            it.copy(
                checkoutVisible = false,
                deliveryQuote = null,
                createdOrder = null,
                checkoutError = null,
            )
        }
    }

    
    fun applyCoupon(code: String) {
        if (code.isBlank()) return
        val current = _state.value
        val subtotal = current.cartItems.sumOf { it.total }
        viewModelScope.launch {
            _state.update { it.copy(couponLoading = true, couponError = null) }
            runCatching { orderRepository.validateCoupon(code, subtotal) }
                .onSuccess { res ->
                    _state.update { it.copy(couponLoading = false, couponCode = res.codigo, couponDiscount = res.desconto) }
                }
                .onFailure {
                    _state.update { it.copy(couponLoading = false, couponCode = "", couponDiscount = 0.0, couponError = "Cupom inválido ou expirado.") }
                }
        }
    }

    fun removeCoupon() {
        _state.update { it.copy(couponCode = "", couponDiscount = 0.0, couponError = null) }
    }

    fun toggleCashback(use: Boolean) {
        _state.update { it.copy(useCashback = use) }
    }

    fun refreshCustomerProfile() {
        viewModelScope.launch {
            authRepository.refreshCustomerProfile()?.let { updated ->
                _state.update { it.copy(customer = updated) }
            }
        }
    }

    fun quoteDelivery(neighborhood: String?) {
        val config = _state.value.deliveryConfig ?: return
        val subtotal = _state.value.cartItems.sumOf { it.total }
        if (config.mode == "bairro" && neighborhood.isNullOrBlank()) {
            _state.update { it.copy(deliveryQuote = null, deliveryQuoteLoading = false) }
            return
        }
        if (config.mode == "distancia") {
            _state.update {
                it.copy(
                    deliveryQuote = null,
                    deliveryQuoteLoading = false,
                    checkoutError = "A entrega por distância ainda requer localização do aparelho.",
                )
            }
            return
        }
        quoteJob?.cancel()
        quoteJob = viewModelScope.launch {
            _state.update { it.copy(deliveryQuoteLoading = true, checkoutError = null) }
            runCatching {
                orderRepository.quoteDelivery(
                    DeliveryQuoteRequest(subtotal = subtotal, neighborhood = neighborhood),
                )
            }.onSuccess { quote ->
                _state.update { it.copy(deliveryQuote = quote, deliveryQuoteLoading = false) }
            }.onFailure {
                _state.update {
                    it.copy(
                        deliveryQuote = null,
                        deliveryQuoteLoading = false,
                        checkoutError = "Não foi possível calcular a entrega.",
                    )
                }
            }
        }
    }


    fun quoteDeliveryWithLocation(latitude: Double, longitude: Double) {
        val config = _state.value.deliveryConfig ?: return
        val subtotal = _state.value.cartItems.sumOf { it.total }
        
        quoteJob?.cancel()
        quoteJob = viewModelScope.launch {
            _state.update { it.copy(deliveryQuoteLoading = true, checkoutError = null) }
            runCatching {
                orderRepository.quoteDelivery(
                    DeliveryQuoteRequest(subtotal = subtotal, latitude = latitude, longitude = longitude)
                )
            }.onSuccess { quote ->
                _state.update { it.copy(deliveryQuote = quote, deliveryQuoteLoading = false) }
            }.onFailure {
                _state.update {
                    it.copy(
                        deliveryQuote = null,
                        deliveryQuoteLoading = false,
                        checkoutError = "Não foi possível calcular a entrega pela localização."
                    )
                }
            }
        }
    }

    fun clearDeliveryQuote() {
        quoteJob?.cancel()
        _state.update { it.copy(deliveryQuote = null, deliveryQuoteLoading = false, checkoutError = null) }
    }

    fun submitOrder(
        customerName: String,
        phone: String,
        delivery: Boolean,
        address: String,
        neighborhood: String,
        paymentMethod: String,
        latitude: Double? = null,
        longitude: Double? = null,
    ) {
        val current = _state.value
        if (current.orderSubmitting || current.cartItems.isEmpty()) return
        if (delivery && current.deliveryQuote?.available != true) {
            _state.update { it.copy(checkoutError = "Calcule e confirme a entrega antes de enviar.") }
            return
        }

        val cashbackToUse = if (current.useCashback) (current.customer?.saldo_cashback ?: 0.0) else 0.0
        val request = CreateOrderRequest(
            uuid = UUID.randomUUID().toString(),
            customerName = customerName.trim(),
            phone = phone.filter(Char::isDigit),
            address = address.trim().takeIf { delivery },
            neighborhood = neighborhood.trim().takeIf { delivery && it.isNotBlank() },
            latitude = latitude,
            longitude = longitude,
            deliveryType = if (delivery) "Delivery" else "Retirada",
            paymentMethod = paymentMethod,
            cashbackUsed = cashbackToUse,
            couponCode = current.couponCode.takeIf { it.isNotBlank() },
            items = current.cartItems.toOrderItemRequests(),
        )
        viewModelScope.launch {
            _state.update { it.copy(orderSubmitting = true, checkoutError = null) }
            runCatching { orderRepository.createOrder(request) }
                .onSuccess { order ->
                    cart.clear()
                    _state.update {
                        it.copy(orderSubmitting = false, createdOrder = order, deliveryQuote = null)
                    }
                }
                .onFailure {
                    _state.update {
                        it.copy(
                            orderSubmitting = false,
                            checkoutError = "Não foi possível registrar o pedido. Revise os dados e tente novamente.",
                        )
                    }
                }
        }
    }

private var autoRefreshJob: Job? = null

    fun showOrders() {
        _state.update { it.copy(ordersVisible = true) }
        refreshOrders()
        startAutoRefresh()
    }

    fun dismissOrders() {
        autoRefreshJob?.cancel()
        _state.update { it.copy(ordersVisible = false, ordersError = null) }
    }

    private fun startAutoRefresh() {
        autoRefreshJob?.cancel()
        autoRefreshJob = viewModelScope.launch {
            while (true) {
                kotlinx.coroutines.delay(10000)
                refreshOrders(silent = true)
            }
        }
    }

    fun refreshOrders(silent: Boolean = false) {
        if (_state.value.ordersLoading) return
        viewModelScope.launch {
            if (!silent) _state.update { it.copy(ordersLoading = true, ordersError = null) }
            runCatching { orderRepository.trackedOrders() }
                .onSuccess { orders ->
                    _state.update { it.copy(orders = orders, ordersLoading = false) }
                }
                .onFailure {
                    _state.update {
                        it.copy(
                            ordersLoading = false,
                            ordersError = "Não foi possível atualizar os pedidos.",
                        )
                    }
                }
        }
    }

    fun refresh() {
        if (_state.value.refreshing && _state.value.catalog != null) return
        viewModelScope.launch {
            _state.update { it.copy(refreshing = true, error = null) }
            runCatching { repository.refresh() }
                .onSuccess {
                    _state.update { current ->
                        current.copy(storeStatusConfirmed = true)
                    }
                }
                .onFailure {
                    _state.update { current ->
                        current.copy(
                            error = if (current.catalog == null) {
                                "Não foi possível carregar o cardápio. Verifique sua conexão."
                            } else {
                                "Sem conexão. Exibindo o último cardápio salvo."
                            },
                        )
                    }
                }
            _state.update { it.copy(refreshing = false) }
        }
    }
}
