package br.com.ritmesa.bisburger.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "catalog_cache")
data class CatalogCacheEntity(
    @PrimaryKey val id: Int = 1,
    val configJson: String,
    val productsJson: String,
    val categoriesJson: String,
    val updatedAt: Long,
)
