package br.com.ritmesa.bisburger.data.model

import com.google.gson.annotations.SerializedName

data class StoreConfig(
    @SerializedName("nome_empresa") val name: String = "BisBurger",
    @SerializedName("telefone") val phone: String? = null,
    @SerializedName("endereco") val address: String? = null,
    @SerializedName("logo") val logoUrl: String? = null,
    @SerializedName("taxa_entrega") val deliveryFee: Double = 0.0,
    @SerializedName("entrega_habilitada") val deliveryEnabled: Boolean = true,
    @SerializedName("tempo_medio_preparo") val preparationMinutes: Int = 30,
    @SerializedName("loja_aberta") val isOpen: Boolean = false,
)

data class Category(
    val id: Long,
    @SerializedName("nome") val name: String,
    @SerializedName("ordem") val order: Int = 0,
    @SerializedName("ativo") val active: Boolean = true,
)

data class ProductOption(
    val id: Long,
    @SerializedName("nome") val name: String,
    @SerializedName("preco_adicional") val additionalPrice: Double = 0.0,
    @SerializedName("ativo") val active: Boolean = true,
)

data class ProductOptionGroup(
    val id: Long,
    @SerializedName("nome") val name: String,
    @SerializedName("minimo") val minimum: Int = 0,
    @SerializedName("maximo") val maximum: Int = 1,
    @SerializedName("obrigatorio") val required: Boolean = false,
    @SerializedName("ativo") val active: Boolean = true,
    @SerializedName("opcoes") val options: List<ProductOption> = emptyList(),
)

data class Product(
    val id: Long,
    @SerializedName("nome") val name: String,
    @SerializedName("categoria") val category: String = "Outros",
    @SerializedName("descricao") val description: String? = null,
    @SerializedName("imagem_url") val imageUrl: String? = null,
    @SerializedName("preco") val price: Double,
    @SerializedName("ativo") val active: Boolean = true,
    @SerializedName("promocao_ativa") val promotionActive: Boolean = false,
    @SerializedName("preco_promocao") val promotionPrice: Double? = null,
    @SerializedName("grupos_opcoes") val optionGroups: List<ProductOptionGroup> = emptyList(),
) {
    val currentPrice: Double
        get() = if (promotionActive) promotionPrice ?: price else price
}

data class CatalogSnapshot(
    val config: StoreConfig,
    val products: List<Product>,
    val categories: List<Category>,
    val updatedAt: Long,
)
