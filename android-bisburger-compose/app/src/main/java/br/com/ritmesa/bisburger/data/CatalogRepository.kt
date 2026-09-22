package br.com.ritmesa.bisburger.data

import br.com.ritmesa.bisburger.data.local.CatalogCacheEntity
import br.com.ritmesa.bisburger.data.local.CatalogDao
import br.com.ritmesa.bisburger.data.model.CatalogSnapshot
import br.com.ritmesa.bisburger.data.model.Category
import br.com.ritmesa.bisburger.data.model.Product
import br.com.ritmesa.bisburger.data.model.StoreConfig
import br.com.ritmesa.bisburger.data.network.BisBurgerApi
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class CatalogRepository(
    private val api: BisBurgerApi,
    private val dao: CatalogDao,
    private val gson: Gson,
) {
    val catalog: Flow<CatalogSnapshot?> = dao.observe().map { cache ->
        cache?.let {
            runCatching {
                CatalogSnapshot(
                    config = gson.fromJson(it.configJson, StoreConfig::class.java),
                    products = gson.fromJson(it.productsJson, object : TypeToken<List<Product>>() {}.type),
                    categories = gson.fromJson(it.categoriesJson, object : TypeToken<List<Category>>() {}.type),
                    updatedAt = it.updatedAt,
                )
            }.getOrNull()
        }
    }

    suspend fun refresh() = coroutineScope {
        val config = async { api.getConfig() }
        val products = async { api.getProducts() }
        val categories = async { api.getCategories() }

        dao.upsert(
            CatalogCacheEntity(
                configJson = gson.toJson(config.await()),
                productsJson = gson.toJson(products.await().filter { it.active }),
                categoriesJson = gson.toJson(categories.await().filter { it.active }),
                updatedAt = System.currentTimeMillis(),
            ),
        )
    }
}
