package br.com.ritmesa.bisburger.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface CatalogDao {
    @Query("SELECT * FROM catalog_cache WHERE id = 1")
    fun observe(): Flow<CatalogCacheEntity?>

    @Upsert
    suspend fun upsert(cache: CatalogCacheEntity)
}
