package br.com.ritmesa.bisburger.notifications

import android.content.Context
import br.com.ritmesa.bisburger.BuildConfig
import br.com.ritmesa.bisburger.data.auth.CustomerSessionStore
import br.com.ritmesa.bisburger.data.network.BisBurgerApi
import br.com.ritmesa.bisburger.data.network.PushTokenRequest
import com.google.firebase.installations.FirebaseInstallations
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.delay
import kotlinx.coroutines.tasks.await

class PushTokenRegistrar(
    context: Context,
    private val api: BisBurgerApi,
    private val sessionStore: CustomerSessionStore,
) {
    private val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    suspend fun registerIfAuthenticated(newToken: String? = null): Boolean {
        newToken?.let(::savePendingToken)

        val customerToken = sessionStore.customerToken() ?: return false
        val firebase = FirebaseMessaging.getInstance()
        val registeredVersion = runCatching {
            preferences.getString(REGISTERED_APP_VERSION, null)
        }.getOrNull()
        val resetVersion = runCatching {
            preferences.getString(INSTALLATION_RESET_VERSION, null)
        }.getOrNull()
        val mustRotateToken = newToken == null &&
            registeredVersion != BuildConfig.VERSION_NAME &&
            resetVersion != BuildConfig.VERSION_NAME
        if (mustRotateToken) {
            firebase.deleteToken().await()
            FirebaseInstallations.getInstance().delete().await()
            preferences.edit()
                .remove(PENDING_TOKEN)
                .putString(INSTALLATION_RESET_VERSION, BuildConfig.VERSION_NAME)
                .apply()
        }
        val pendingToken = if (mustRotateToken) {
            null
        } else {
            runCatching {
                preferences.getString(PENDING_TOKEN, null)
            }.getOrNull()
        }
        val fcmToken = newToken ?: pendingToken ?: firebaseTokenWithRetry(firebase)

        val response = api.registerCustomerPushToken(
            authorization = "Bearer $customerToken",
            request = PushTokenRequest(
                token = fcmToken,
                app_version = BuildConfig.VERSION_NAME,
            ),
        )
        if (!response.isSuccessful) {
            error("Registro do token FCM recusado: HTTP ${response.code()}")
        }

        preferences.edit()
            .remove(PENDING_TOKEN)
            .putString(REGISTERED_APP_VERSION, BuildConfig.VERSION_NAME)
            .apply()
        return true
    }

    private suspend fun firebaseTokenWithRetry(firebase: FirebaseMessaging): String {
        var lastError: Throwable? = null
        repeat(4) { attempt ->
            runCatching { firebase.token.await() }
                .onSuccess { return it }
                .onFailure { lastError = it }
            delay((attempt + 1) * 1_500L)
        }
        throw lastError ?: IllegalStateException("Firebase não retornou um token.")
    }

    fun savePendingToken(token: String) {
        preferences.edit().putString(PENDING_TOKEN, token).apply()
    }

    companion object {
        private const val PREFERENCES = "bisburger_session"
        private const val PENDING_TOKEN = "pending_fcm_token"
        private const val REGISTERED_APP_VERSION = "push_registered_app_version"
        private const val INSTALLATION_RESET_VERSION = "push_installation_reset_version"
    }
}
