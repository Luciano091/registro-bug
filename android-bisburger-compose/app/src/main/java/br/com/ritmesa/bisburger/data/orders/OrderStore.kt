package br.com.ritmesa.bisburger.data.orders

import android.content.Context

class OrderStore(context: Context) {
    private val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    fun addTrackingCode(code: String) {
        val current = trackingCodes().toMutableSet()
        current += code
        preferences.edit().putStringSet(TRACKING_CODES, current).apply()
    }

    fun trackingCodes(): List<String> =
        runCatching { preferences.getStringSet(TRACKING_CODES, emptySet()) }
            .getOrNull()
            .orEmpty()
            .toList()

    companion object {
        private const val PREFERENCES = "bisburger_orders"
        private const val TRACKING_CODES = "tracking_codes"
    }
}
