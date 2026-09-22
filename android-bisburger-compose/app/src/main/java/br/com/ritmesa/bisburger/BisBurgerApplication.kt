package br.com.ritmesa.bisburger

import android.app.Application
import android.util.Log
import androidx.room.Room
import br.com.ritmesa.bisburger.cart.Cart
import br.com.ritmesa.bisburger.data.CatalogRepository
import br.com.ritmesa.bisburger.data.auth.CustomerAuthRepository
import br.com.ritmesa.bisburger.data.auth.CustomerSessionStore
import br.com.ritmesa.bisburger.data.local.BisBurgerDatabase
import br.com.ritmesa.bisburger.data.network.BisBurgerApi
import br.com.ritmesa.bisburger.data.orders.OrderRepository
import br.com.ritmesa.bisburger.data.orders.OrderStore
import br.com.ritmesa.bisburger.notifications.PushTokenRegistrar
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class BisBurgerApplication : Application() {
    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    lateinit var catalogRepository: CatalogRepository
        private set
    lateinit var customerAuthRepository: CustomerAuthRepository
        private set
    lateinit var orderRepository: OrderRepository
        private set
    val cart = Cart()
    private lateinit var pushTokenRegistrar: PushTokenRegistrar
    private val _pushRegistrationStatus = MutableStateFlow("Verificando notificações…")
    val pushRegistrationStatus = _pushRegistrationStatus.asStateFlow()

    override fun onCreate() {
        super.onCreate()
        StartupTrace.mark("application_on_create")

        val gson = Gson()
        val database = Room.databaseBuilder(
            this,
            BisBurgerDatabase::class.java,
            "bisburger.db",
        ).build()
        val httpClient = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = if (BuildConfig.DEBUG) {
                        HttpLoggingInterceptor.Level.BASIC
                    } else {
                        HttpLoggingInterceptor.Level.NONE
                    }
                },
            )
            .build()
        val api = Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(httpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(BisBurgerApi::class.java)

        val customerSessionStore = CustomerSessionStore(this)
        catalogRepository = CatalogRepository(api, database.catalogDao(), gson)
        pushTokenRegistrar = PushTokenRegistrar(this, api, customerSessionStore)
        customerAuthRepository = CustomerAuthRepository(api, customerSessionStore) { registerPushToken() }
        orderRepository = OrderRepository(api, customerSessionStore, OrderStore(this))
        registerPushToken()
        StartupTrace.mark("dependencies_ready")
    }

    fun registerPushToken(token: String? = null) {
        token?.let(pushTokenRegistrar::savePendingToken)
        _pushRegistrationStatus.value = "Ativando notificações…"
        applicationScope.launch {
            runCatching { pushTokenRegistrar.registerIfAuthenticated(token) }
                .onSuccess { registered ->
                    _pushRegistrationStatus.value = if (registered) {
                        "Notificações ativas"
                    } else {
                        "Entre na conta para ativar as notificações"
                    }
                }
                .onFailure { error ->
                    Log.w("BisBurgerPush", "Token FCM permanecerá pendente para nova tentativa.", error)
                    val detail = error.message?.take(140) ?: error.javaClass.simpleName
                    _pushRegistrationStatus.value = "Falha ao ativar: $detail"
                }
        }
    }
}
