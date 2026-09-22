package br.com.ritmesa.bisburger.data.model

import org.junit.Assert.assertEquals
import org.junit.Test

class ProductTest {
    @Test
    fun `currentPrice uses promotion price when promotion is active`() {
        val product = product(promotionActive = true, promotionPrice = 18.5)

        assertEquals(18.5, product.currentPrice, 0.0)
    }

    @Test
    fun `currentPrice falls back to regular price when promotion has no price`() {
        val product = product(promotionActive = true, promotionPrice = null)

        assertEquals(25.0, product.currentPrice, 0.0)
    }

    @Test
    fun `currentPrice ignores promotion price when promotion is inactive`() {
        val product = product(promotionActive = false, promotionPrice = 18.5)

        assertEquals(25.0, product.currentPrice, 0.0)
    }

    private fun product(
        promotionActive: Boolean,
        promotionPrice: Double?,
    ) = Product(
        id = 1,
        name = "Hambúrguer",
        price = 25.0,
        promotionActive = promotionActive,
        promotionPrice = promotionPrice,
    )
}
