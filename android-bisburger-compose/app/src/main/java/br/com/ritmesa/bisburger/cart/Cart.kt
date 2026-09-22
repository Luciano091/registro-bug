package br.com.ritmesa.bisburger.cart

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class Cart {
    private val _items = MutableStateFlow<List<CartItem>>(emptyList())
    val items: StateFlow<List<CartItem>> = _items.asStateFlow()

    fun add(item: CartItem) {
        require(item.quantity > 0) { "A quantidade precisa ser maior que zero." }
        _items.update { it + item }
    }

    fun updateQuantity(itemId: String, delta: Int) {
        _items.update { items ->
            items.map { item ->
                if (item.id == itemId) item.copy(quantity = maxOf(1, item.quantity + delta)) else item
            }
        }
    }

    fun remove(itemId: String) {
        _items.update { items -> items.filterNot { it.id == itemId } }
    }

    fun clear() {
        _items.value = emptyList()
    }

    fun count(): Int = _items.value.sumOf { it.quantity }

    fun total(): Double = _items.value.sumOf { it.total }
}
