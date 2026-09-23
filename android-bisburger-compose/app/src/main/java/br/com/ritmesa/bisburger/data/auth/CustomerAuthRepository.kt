package br.com.ritmesa.bisburger.data.auth

import br.com.ritmesa.bisburger.data.network.BisBurgerApi
import br.com.ritmesa.bisburger.data.network.CustomerProfile
import br.com.ritmesa.bisburger.data.network.GoogleAuthRequest
import br.com.ritmesa.bisburger.data.network.PhoneLinkRequest

class CustomerAuthRepository(
    private val api: BisBurgerApi,
    private val sessionStore: CustomerSessionStore,
    private val onAuthenticated: () -> Unit,
) {
    fun currentCustomer(): CustomerProfile? = sessionStore.customer()

    suspend fun signInWithGoogle(idToken: String): CustomerProfile {
        val response = api.authenticateWithGoogle(GoogleAuthRequest(idToken))
        sessionStore.saveSession(response.token, response.cliente)
        onAuthenticated()
        return response.cliente
    }

    
    suspend fun refreshCustomerProfile(): CustomerProfile? {
        val token = sessionStore.customerToken() ?: return null
        return runCatching {
            val updated = api.getCustomerProfile("Bearer $token")
            sessionStore.saveSession(token, updated)
            updated
        }.getOrNull()
    }

    suspend fun linkPhone(phone: String): CustomerProfile? {
        val token = sessionStore.customerToken() ?: return null
        return runCatching {
            val updated = api.linkCustomerPhone("Bearer $token", PhoneLinkRequest(phone))
            sessionStore.saveSession(token, updated)
            updated
        }.getOrNull()
    }

    fun signOut() {
        sessionStore.clearCustomerToken()
    }
}
