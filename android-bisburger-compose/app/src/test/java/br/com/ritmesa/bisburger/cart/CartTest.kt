package br.com.ritmesa.bisburger.cart

import br.com.ritmesa.bisburger.data.model.Product
import br.com.ritmesa.bisburger.data.model.ProductOptionGroup
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CartTest {
    @Test
    fun `total includes option quantities and product quantity`() {
        val item = CartItem(
            productId = 10,
            name = "Combo",
            basePrice = 20.0,
            quantity = 2,
            options = listOf(
                SelectedOption(1, 1, "Adicionais", "Bacon", 3.0, quantity = 2),
            ),
        )

        assertEquals(52.0, item.total, 0.0)
    }

    @Test
    fun `required group rejects an empty selection`() {
        val result = validateSelection(
            product = productWithGroup(minimum = 0, maximum = 1, required = true),
            selectedOptions = emptyList(),
        )

        assertTrue(result is SelectionValidation.Invalid)
    }

    @Test
    fun `group rejects selections over maximum`() {
        val result = validateSelection(
            product = productWithGroup(minimum = 0, maximum = 2, required = false),
            selectedOptions = listOf(
                SelectedOption(1, 7, "Adicionais", "Bacon", 3.0, quantity = 3),
            ),
        )

        assertTrue(result is SelectionValidation.Invalid)
    }

    @Test
    fun `cart quantity never falls below one`() {
        val cart = Cart()
        val item = CartItem(productId = 10, name = "Combo", basePrice = 20.0, quantity = 1)
        cart.add(item)

        cart.updateQuantity(item.id, -10)

        assertEquals(1, cart.items.value.single().quantity)
    }

    @Test
    fun `order mapping preserves product option ids and quantities`() {
        val item = CartItem(
            productId = 10,
            name = "Combo",
            basePrice = 20.0,
            quantity = 2,
            note = "Sem cebola",
            options = listOf(
                SelectedOption(31, 7, "Adicionais", "Bacon", 3.0, quantity = 2),
            ),
        )

        val request = listOf(item).toOrderItemRequests().single()

        assertEquals(10L, request.productId)
        assertEquals(2, request.quantity)
        assertEquals("Sem cebola", request.note)
        assertEquals(31L, request.options.single().optionId)
        assertEquals(2, request.options.single().quantity)
    }

    private fun productWithGroup(
        minimum: Int,
        maximum: Int,
        required: Boolean,
    ) = Product(
        id = 10,
        name = "Combo",
        price = 20.0,
        optionGroups = listOf(
            ProductOptionGroup(
                id = 7,
                name = "Adicionais",
                minimum = minimum,
                maximum = maximum,
                required = required,
            ),
        ),
    )
}
