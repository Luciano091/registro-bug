package br.com.ritmesa.bisburger.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [CatalogCacheEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class BisBurgerDatabase : RoomDatabase() {
    abstract fun catalogDao(): CatalogDao
}
