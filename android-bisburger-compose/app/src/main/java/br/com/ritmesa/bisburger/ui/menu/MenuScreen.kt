package br.com.ritmesa.bisburger.ui.menu

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.ritmesa.bisburger.data.model.CatalogSnapshot
import br.com.ritmesa.bisburger.data.model.Product
import br.com.ritmesa.bisburger.StartupTrace
import br.com.ritmesa.bisburger.R
import br.com.ritmesa.bisburger.cart.SelectedOption
import br.com.ritmesa.bisburger.ui.theme.Dark
import br.com.ritmesa.bisburger.ui.theme.Orange
import coil.compose.AsyncImage
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material.icons.outlined.RestaurantMenu
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.rounded.LocalFireDepartment
import java.text.NumberFormat
import java.util.Locale

@Composable
fun MenuScreen(
    state: MenuUiState,
    onSelectCategory: (String) -> Unit,
    onSelectProduct: (Product) -> Unit,
    onDismissProduct: () -> Unit,
    onAddToCart: (Product, Int, List<SelectedOption>, String) -> Unit,
    onShowCart: () -> Unit,
    onDismissCart: () -> Unit,
    onChangeCartQuantity: (String, Int) -> Unit,
    onRemoveCartItem: (String) -> Unit,
    onShowAccount: () -> Unit,
    onDismissAccount: () -> Unit,
    onGoogleSignIn: () -> Unit,
    onSignOut: () -> Unit,
    onRetryNotifications: () -> Unit,
    onShowCheckout: () -> Unit,
    onDismissCheckout: () -> Unit,
    onQuoteDelivery: (String?) -> Unit,
    onQuoteDeliveryWithLocation: (Double, Double) -> Unit,
    onClearDeliveryQuote: () -> Unit,
    onSubmitOrder: (String, String, Boolean, String, String, String, Double?, Double?) -> Unit,
    onShowOrders: () -> Unit,
    onApplyCoupon: (String) -> Unit,
    onRemoveCoupon: () -> Unit,
    onToggleCashback: (Boolean) -> Unit,
    onDismissOrders: () -> Unit,
    onRefreshOrders: () -> Unit,
    onDismissPromoCoupon: () -> Unit,
    onUsePromoCoupon: () -> Unit,
) {
    LaunchedEffect(state.catalog) {
        if (state.catalog != null) {
            StartupTrace.markCatalogVisibleOnce()
        }
    }

    val cartCount = state.cartItems.sumOf { it.quantity }
    val cartTotal = state.cartItems.sumOf { it.total }
    var couponsVisible by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            Column {
                if (cartCount > 0) {
                    CartBar(cartCount, cartTotal, onShowCart)
                }
                MainBottomNavigation(
                    selected = when {
                        couponsVisible -> "cupons"
                        state.ordersVisible -> "pedidos"
                        state.accountVisible -> "conta"
                        else -> "cardapio"
                    },
                    onMenu = {
                        couponsVisible = false
                        if (state.ordersVisible) onDismissOrders()
                        if (state.accountVisible) onDismissAccount()
                    },
                    onCoupons = { couponsVisible = true },
                    onOrders = onShowOrders,
                    onAccount = onShowAccount,
                )
            }
        },
    ) { padding ->
        if (state.catalog == null) {
            MenuSkeleton(Modifier.padding(padding))
        } else {
            CatalogContent(
                catalog = state.catalog,
                selectedCategory = state.selectedCategory,
                refreshing = state.refreshing,
                storeStatusConfirmed = state.storeStatusConfirmed,
                error = state.error,
                onSelectCategory = onSelectCategory,
                onSelectProduct = onSelectProduct,
                modifier = Modifier.padding(padding),
            )
        }
    }

    state.selectedProduct?.let { product ->
        ProductConfiguratorSheet(
            product = product,
            canOrder = state.catalog?.config?.isOpen == true,
            statusConfirmed = state.storeStatusConfirmed,
            onDismiss = onDismissProduct,
            onAdd = onAddToCart,
        )
    }
    if (state.cartVisible && state.cartItems.isNotEmpty()) {
        CartSheet(
            items = state.cartItems,
            onDismiss = onDismissCart,
            onChangeQuantity = onChangeCartQuantity,
            onRemove = onRemoveCartItem,
            canCheckout = state.storeStatusConfirmed && state.catalog?.config?.isOpen == true,
            onCheckout = onShowCheckout,
        )
    }
    if (state.accountVisible) {
        AccountSheet(
            customer = state.customer,
            loading = state.loginLoading,
            error = state.loginError,
            notificationStatus = state.pushRegistrationStatus,
            onDismiss = onDismissAccount,
            onGoogleSignIn = onGoogleSignIn,
            onSignOut = onSignOut,
            onRetryNotifications = onRetryNotifications,
        )
    }
    if (state.checkoutVisible) {
        CheckoutSheet(
            items = state.cartItems,
            customer = state.customer,
            deliveryConfig = state.deliveryConfig,
            configLoading = state.deliveryConfigLoading,
            quote = state.deliveryQuote,
            quoteLoading = state.deliveryQuoteLoading,
            submitting = state.orderSubmitting,
            createdOrder = state.createdOrder,
            error = state.checkoutError,
            couponCode = state.couponCode,
            couponDiscount = state.couponDiscount,
            couponError = state.couponError,
            couponLoading = state.couponLoading,
            suggestedCouponCode = state.suggestedCouponCode,
            useCashback = state.useCashback,
            onApplyCoupon = onApplyCoupon,
            onRemoveCoupon = onRemoveCoupon,
            onToggleCashback = onToggleCashback,
            onDismiss = onDismissCheckout,
            onQuoteDelivery = onQuoteDelivery,
            onQuoteDeliveryWithLocation = onQuoteDeliveryWithLocation,
            onClearDeliveryQuote = onClearDeliveryQuote,
            onSubmit = onSubmitOrder,
        )
    }
    if (state.ordersVisible) {
        OrdersSheet(
            orders = state.orders,
            loading = state.ordersLoading,
            error = state.ordersError,
            onDismiss = onDismissOrders,
            onRefresh = onRefreshOrders,
        )
    }
    if (couponsVisible) {
        CouponsSheet(
            cartTotal = cartTotal,
            appliedCode = state.couponCode,
            suggestedCode = state.suggestedCouponCode,
            discount = state.couponDiscount,
            loading = state.couponLoading,
            error = state.couponError,
            onApply = onApplyCoupon,
            onRemove = onRemoveCoupon,
            onDismiss = { couponsVisible = false },
        )
    }
    if (state.promoCouponVisible) {
        state.highlightedCoupon?.let { coupon ->
            CouponPromoDialog(
                coupon = coupon,
                onDismiss = onDismissPromoCoupon,
                onUseCoupon = onUsePromoCoupon,
            )
        }
    }
}

@Composable
private fun CatalogContent(
    catalog: CatalogSnapshot,
    selectedCategory: String,
    refreshing: Boolean,
    storeStatusConfirmed: Boolean,
    error: String?,
    onSelectCategory: (String) -> Unit,
    onSelectProduct: (Product) -> Unit,
    modifier: Modifier = Modifier,
) {
    val categoryNames = buildList {
        add("Todos")
        addAll(catalog.categories.sortedBy { it.order }.map { it.name })
        addAll(catalog.products.map { it.category }.filter { it !in this }.distinct())
    }
    val visibleProducts = if (selectedCategory == "Todos") {
        catalog.products
    } else {
        catalog.products.filter { it.category == selectedCategory }
    }
    val featuredProduct = catalog.products.firstOrNull { it.featured }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            StoreHeader(
                catalog,
                refreshing,
                storeStatusConfirmed,
            )
        }
        if (error != null) {
            item {
                Text(
                    text = error,
                    color = Color(0xFF92400E),
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier
                        .padding(horizontal = 16.dp)
                        .background(Color(0xFFFFF7ED), RoundedCornerShape(12.dp))
                        .padding(12.dp),
                )
            }
        }
        item {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp),
            ) {
                items(categoryNames) { category ->
                    val selected = category == selectedCategory
                    AssistChip(
                        onClick = { onSelectCategory(category) },
                        label = { Text(category, fontWeight = FontWeight.SemiBold) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = if (selected) Orange else Color.White,
                            labelColor = if (selected) Color.White else Color(0xFF52525B),
                        ),
                    )
                }
            }
        }
        val promotions = catalog.products.filter { it.promotionActive }
        if (promotions.isNotEmpty()) {
            item {
                PromoCarousel(promotions, onSelectProduct)
            }
        }
        if (featuredProduct != null && selectedCategory == "Todos") {
            item {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 18.dp, end = 18.dp, bottom = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Outlined.Star,
                            contentDescription = null,
                            tint = Orange,
                            modifier = Modifier.size(19.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("Destaque do dia", fontWeight = FontWeight.Black, fontSize = 18.sp)
                    }
                    ProductCard(
                        product = featuredProduct,
                        onClick = { onSelectProduct(featuredProduct) },
                        modifier = Modifier.padding(horizontal = 16.dp),
                    )
                }
            }
        }
        items(visibleProducts, key = { it.id }) { product ->
            ProductCard(
                product = product,
                onClick = { onSelectProduct(product) },
                modifier = Modifier.padding(horizontal = 16.dp),
            )
        }
        item { Spacer(Modifier.height(20.dp)) }
    }
}

@Composable
private fun StoreHeader(
    catalog: CatalogSnapshot,
    refreshing: Boolean,
    storeStatusConfirmed: Boolean,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp))
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF111111), Color(0xFF1D1713), Color(0xFF402616)),
                ),
            )
            .statusBarsPadding()
            .padding(horizontal = 18.dp, vertical = 18.dp),
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier
                    .size(112.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFF181818)),
            ) {
                AsyncImage(
                    model = catalog.config.logoUrl ?: R.mipmap.ic_launcher_foreground,
                    contentDescription = "Logo ${catalog.config.name}",
                    contentScale = ContentScale.Crop,
                    fallback = painterResource(R.mipmap.ic_launcher_foreground),
                    error = painterResource(R.mipmap.ic_launcher_foreground),
                    modifier = Modifier
                        .fillMaxSize()
                        .scale(1.4f),
                )
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.Bottom) {
                    val businessName = catalog.config.name
                    if (businessName.equals("BisBurger", ignoreCase = true)) {
                        Text("Bis", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Black)
                        Text("Burger", color = Color(0xFFFFC914), fontSize = 30.sp, fontWeight = FontWeight.Black)
                    } else {
                        Text(
                            businessName,
                            color = Color.White,
                            fontSize = 30.sp,
                            fontWeight = FontWeight.Black,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                Spacer(Modifier.height(7.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(
                            when {
                                !storeStatusConfirmed -> Color(0xFF5B4815)
                                catalog.config.isOpen -> Color(0xFF075C46)
                                else -> Color(0xFF6B2020)
                            },
                        )
                        .padding(horizontal = 7.dp, vertical = 2.dp),
                ) {
                    Box(
                        Modifier.size(5.dp).background(
                            when {
                                !storeStatusConfirmed -> Color(0xFFFBBF24)
                                catalog.config.isOpen -> Color(0xFF34D399)
                                else -> Color(0xFFF87171)
                            },
                            CircleShape,
                        ),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        when {
                            !storeStatusConfirmed -> "VERIFICANDO"
                            catalog.config.isOpen -> "ABERTO AGORA"
                            else -> "FECHADO"
                        },
                        color = when {
                            !storeStatusConfirmed -> Color(0xFFFDE68A)
                            catalog.config.isOpen -> Color(0xFF6EE7B7)
                            else -> Color(0xFFFCA5A5)
                        },
                        fontWeight = FontWeight.Bold,
                        fontSize = 8.sp,
                        lineHeight = 10.sp,
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    HeaderMetric(
                        icon = {
                            Icon(
                                Icons.Outlined.LocalShipping,
                                null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp),
                            )
                        },
                        title = formatDeliveryFee(catalog.config.deliveryFee),
                        subtitle = "Cajueiro-AL",
                    )
                    Box(
                        Modifier
                            .padding(horizontal = 7.dp)
                            .width(1.dp)
                            .height(28.dp)
                            .background(Color(0xFF6B625D)),
                    )
                    HeaderMetric(
                        icon = {
                            Icon(
                                Icons.Outlined.Schedule,
                                null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp),
                            )
                        },
                        title = "${catalog.config.preparationMinutes} min",
                        subtitle = "tempo médio",
                    )
                }
            }
            if (refreshing) {
                CircularProgressIndicator(
                    modifier = Modifier.size(17.dp),
                    color = Orange,
                    strokeWidth = 2.dp,
                )
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Brush.horizontalGradient(listOf(Color(0xFFFFF1D6), Color(0xFFFFD58E))))
                .padding(horizontal = 15.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.CardGiftcard, null, tint = Color(0xFFF05A18), modifier = Modifier.size(23.dp))
            Spacer(Modifier.width(11.dp))
            Text(
                "Ganhe 2% de cashback em todos os seus pedidos!",
                color = Color(0xFF9A3412),
                fontSize = 13.sp,
                lineHeight = 17.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun HeaderMetric(
    icon: @Composable () -> Unit,
    title: String,
    subtitle: String,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        icon()
        Spacer(Modifier.width(5.dp))
        Column {
            Text(title, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Black, maxLines = 1)
            Text(subtitle, color = Color(0xFFB7B0AC), fontSize = 8.sp, maxLines = 1)
        }
    }
}

@Composable
private fun ProductCard(
    product: Product,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                if (product.promotionActive) {
                    Text("OFERTA", color = Orange, fontSize = 11.sp, fontWeight = FontWeight.Black)
                }
                Text(
                    product.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                product.description?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        it,
                        color = Color(0xFF71717A),
                        fontSize = 13.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 5.dp),
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 10.dp),
                ) {
                    if (product.promotionActive) {
                        Text(
                            money(product.price),
                            color = Color(0xFFA1A1AA),
                            fontSize = 12.sp,
                            textDecoration = TextDecoration.LineThrough,
                        )
                        Spacer(Modifier.width(7.dp))
                    }
                    Text(
                        money(product.currentPrice),
                        color = if (product.promotionActive) Orange else Dark,
                        fontWeight = FontWeight.Black,
                        fontSize = 17.sp,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            AsyncImage(
                model = product.imageUrl,
                contentDescription = product.name,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .size(104.dp)
                    .background(Color(0xFFFFF7ED), RoundedCornerShape(14.dp)),
            )
        }
    }
}

@Composable
private fun CartBar(
    count: Int,
    total: Double,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Button(
            onClick = onClick,
            colors = ButtonDefaults.buttonColors(containerColor = Orange),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Ver carrinho · $count ${if (count == 1) "item" else "itens"}", fontWeight = FontWeight.Black)
                Text(money(total), fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun MainBottomNavigation(
    selected: String,
    onMenu: () -> Unit,
    onCoupons: () -> Unit,
    onOrders: () -> Unit,
    onAccount: () -> Unit,
) {
    data class Destination(
        val id: String,
        val label: String,
        val icon: androidx.compose.ui.graphics.vector.ImageVector,
        val action: () -> Unit,
    )

    val destinations = listOf(
        Destination("cardapio", "Cardápio", Icons.Outlined.RestaurantMenu, onMenu),
        Destination("cupons", "Cupons", Icons.Outlined.ConfirmationNumber, onCoupons),
        Destination("pedidos", "Pedidos", Icons.AutoMirrored.Outlined.ReceiptLong, onOrders),
        Destination("conta", "Conta", Icons.Outlined.PersonOutline, onAccount),
    )
    NavigationBar(
        containerColor = Color(0xFFFFF7F0),
        tonalElevation = 2.dp,
        modifier = Modifier
            .navigationBarsPadding()
            .height(64.dp),
    ) {
        destinations.forEach { destination ->
            val isSelected = destination.id == selected
            NavigationBarItem(
                selected = isSelected,
                onClick = destination.action,
                icon = {
                    Icon(
                        destination.icon,
                        contentDescription = destination.label,
                        modifier = Modifier.size(24.dp),
                    )
                },
                label = { Text(destination.label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Orange,
                    selectedTextColor = Orange,
                    indicatorColor = Color(0xFFFFE5D3),
                    unselectedIconColor = Color(0xFF6B7280),
                    unselectedTextColor = Color(0xFF6B7280),
                ),
            )
        }
    }
}

@Composable
private fun MenuSkeleton(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "skeleton")
    val alpha by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 0.75f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "skeleton-alpha",
    )
    Column(modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(150.dp)
                .background(Dark),
            contentAlignment = Alignment.Center,
        ) {
            Text("BisBurger", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Black)
        }
        repeat(4) {
            Box(
                Modifier
                    .padding(horizontal = 16.dp, vertical = 7.dp)
                    .fillMaxWidth()
                    .height(126.dp)
                    .alpha(alpha)
                    .background(Color(0xFFE4E4E7), RoundedCornerShape(18.dp)),
            )
        }
    }
}

private fun money(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(value)

private fun formatDeliveryFee(value: Double): String =
    if (value == 0.0) "Entrega grátis" else "Taxa ${money(value)}"

@Composable
private fun PromoCarousel(
    promotions: List<Product>,
    onClick: (Product) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.padding(top = 8.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 18.dp, end = 18.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Rounded.LocalFireDepartment,
                contentDescription = null,
                tint = Orange,
                modifier = Modifier.size(19.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text("Ofertas do dia", fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.weight(1f))
            Text("Deslize →", color = Color(0xFF71717A), fontSize = 11.sp)
        }
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 18.dp),
        ) {
            items(promotions, key = { it.id }) { product ->
                PromoCard(product, onClick = { onClick(product) })
            }
        }
    }
}

@Composable
private fun PromoCard(
    product: Product,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .width(274.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column {
            AsyncImage(
                model = product.imageUrl,
                contentDescription = product.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(154.dp)
                    .background(Color(0xFFFFF7ED)),
            )
            Column(Modifier.padding(14.dp)) {
                Text(
                    "🔥 Oferta",
                    color = Color(0xFFC2410C),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(Color(0xFFFFE8D5))
                        .padding(horizontal = 9.dp, vertical = 4.dp),
                )
                Text(
                    product.name,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 8.dp),
                )
                product.description?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        it,
                        color = Color(0xFF71717A),
                        fontSize = 12.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 10.dp),
                ) {
                    Text(
                        money(product.price),
                        textDecoration = TextDecoration.LineThrough,
                        color = Color(0xFFA1A1AA),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.width(7.dp))
                    Text(
                        money(product.currentPrice),
                        color = Orange,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
        }
    }
}
