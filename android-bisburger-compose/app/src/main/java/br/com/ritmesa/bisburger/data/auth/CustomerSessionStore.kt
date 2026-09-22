package br.com.ritmesa.bisburger.data.auth

import android.content.Context
import br.com.ritmesa.bisburger.data.network.CustomerProfile

class CustomerSessionStore(context: Context) {
    private val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    fun customerToken(): String? = safeString(CUSTOMER_TOKEN)
        ?.takeIf { it.isNotBlank() }

    fun saveCustomerToken(token: String) {
        preferences.edit().putString(CUSTOMER_TOKEN, token).apply()
    }

    fun saveSession(token: String, customer: CustomerProfile) {
        preferences.edit()
            .putString(CUSTOMER_TOKEN, token)
            .putLong(CUSTOMER_ID, customer.id)
            .putString(CUSTOMER_NAME, customer.nome)
            .putString(CUSTOMER_EMAIL, customer.email)
            .putString(CUSTOMER_PHOTO, customer.foto_url)
            .putString(CUSTOMER_PHONE, customer.telefone)
            .putString(CUSTOMER_ADDRESS, customer.endereco)
            .putString(CUSTOMER_CASHBACK, customer.saldo_cashback.toString())
            .apply()
    }

    fun customer(): CustomerProfile? {
        if (customerToken() == null || !preferences.contains(CUSTOMER_ID)) return null
        return CustomerProfile(
            id = runCatching { preferences.getLong(CUSTOMER_ID, 0) }.getOrDefault(0),
            nome = safeString(CUSTOMER_NAME).orEmpty(),
            email = safeString(CUSTOMER_EMAIL).orEmpty(),
            foto_url = safeString(CUSTOMER_PHOTO),
            saldo_cashback = safeString(CUSTOMER_CASHBACK)?.toDoubleOrNull() ?: 0.0,
            telefone = safeString(CUSTOMER_PHONE),
            endereco = safeString(CUSTOMER_ADDRESS),
        )
    }

    private fun safeString(key: String): String? =
        runCatching { preferences.getString(key, null) }.getOrNull()

    fun clearCustomerToken() {
        preferences.edit()
            .remove(CUSTOMER_TOKEN)
            .remove(CUSTOMER_ID)
            .remove(CUSTOMER_NAME)
            .remove(CUSTOMER_EMAIL)
            .remove(CUSTOMER_PHOTO)
            .remove(CUSTOMER_PHONE)
            .remove(CUSTOMER_ADDRESS)
            .remove(CUSTOMER_CASHBACK)
            .apply()
    }

    companion object {
        private const val PREFERENCES = "bisburger_session"
        private const val CUSTOMER_TOKEN = "customer_auth_token"
        private const val CUSTOMER_ID = "customer_id"
        private const val CUSTOMER_NAME = "customer_name"
        private const val CUSTOMER_EMAIL = "customer_email"
        private const val CUSTOMER_PHOTO = "customer_photo"
        private const val CUSTOMER_PHONE = "customer_phone"
        private const val CUSTOMER_ADDRESS = "customer_address"
        private const val CUSTOMER_CASHBACK = "customer_cashback"
    }
}
