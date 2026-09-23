package br.com.ritmesa.bisburger

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.Lifecycle
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.LaunchedEffect
import br.com.ritmesa.bisburger.data.auth.GoogleCredentialClient
import br.com.ritmesa.bisburger.ui.menu.MenuScreen
import br.com.ritmesa.bisburger.ui.menu.MenuViewModel
import br.com.ritmesa.bisburger.ui.theme.BisBurgerTheme
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow

class MainActivity : ComponentActivity() {
    private val openOrdersRequested = MutableStateFlow(false)
    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        openOrdersRequested.value = intent.getBooleanExtra(EXTRA_OPEN_ORDERS, false)
        StartupTrace.mark("activity_on_create")

        StartupTrace.mark("compose_content_requested")
        val googleCredentialClient = GoogleCredentialClient(this)
        setContent {
            BisBurgerTheme {
                val viewModel: MenuViewModel = viewModel()
                val state = viewModel.state.collectAsStateWithLifecycle().value
                val shouldOpenOrders = openOrdersRequested.collectAsStateWithLifecycle().value
                val scope = rememberCoroutineScope()
                LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
                    viewModel.refreshCustomerProfile()
                }
                LaunchedEffect(shouldOpenOrders) {
                    if (shouldOpenOrders) {
                        viewModel.showOrders()
                        openOrdersRequested.value = false
                    }
                }
                MenuScreen(
                    state = state,
                    onSelectCategory = viewModel::selectCategory,
                    onSelectProduct = viewModel::selectProduct,
                    onDismissProduct = viewModel::dismissProduct,
                    onAddToCart = viewModel::addToCart,
                    onShowCart = viewModel::showCart,
                    onDismissCart = viewModel::dismissCart,
                    onChangeCartQuantity = viewModel::changeCartQuantity,
                    onRemoveCartItem = viewModel::removeCartItem,
                    onShowAccount = viewModel::showAccount,
                    onDismissAccount = viewModel::dismissAccount,
                    onGoogleSignIn = {
                        viewModel.startGoogleSignIn()
                        scope.launch {
                            runCatching { googleCredentialClient.getIdToken() }
                                .onSuccess(viewModel::signInWithGoogleToken)
                                .onFailure { viewModel.reportGoogleCredentialError() }
                        }
                    },
                    onSignOut = viewModel::signOut,
                    onRetryNotifications = viewModel::retryNotifications,
                    onShowCheckout = viewModel::showCheckout,
                    onDismissCheckout = viewModel::dismissCheckout,
                    onQuoteDelivery = viewModel::quoteDelivery,
                        onQuoteDeliveryWithLocation = viewModel::quoteDeliveryWithLocation,
                    onClearDeliveryQuote = viewModel::clearDeliveryQuote,
                    onSubmitOrder = { name, phone, delivery, address, neighborhood, paymentMethod, lat, lon -> viewModel.submitOrder(name, phone, delivery, address, neighborhood, paymentMethod, lat, lon) },
                    onShowOrders = viewModel::showOrders,
                        onApplyCoupon = viewModel::applyCoupon,
                        onRemoveCoupon = viewModel::removeCoupon,
                        onToggleCashback = viewModel::toggleCashback,
                    onDismissOrders = viewModel::dismissOrders,
                    onRefreshOrders = viewModel::refreshOrders,
                    onDismissPromoCoupon = viewModel::dismissPromoCoupon,
                    onUsePromoCoupon = viewModel::usePromoCoupon,
                )
            }
        }

        window.decorView.post {
            if (
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
                android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.getBooleanExtra(EXTRA_OPEN_ORDERS, false)) {
            openOrdersRequested.value = true
        }
    }

    companion object {
        const val EXTRA_OPEN_ORDERS = "open_orders"
    }
}
