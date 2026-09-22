package br.com.ritmesa.bisburger

import android.os.Process
import android.os.SystemClock
import android.util.Log
import java.util.concurrent.atomic.AtomicBoolean

/** Lightweight startup markers visible in Logcat under the BisBurgerStartup tag. */
object StartupTrace {
    private const val TAG = "BisBurgerStartup"
    private val catalogLogged = AtomicBoolean(false)

    fun mark(stage: String) {
        val elapsedMs = SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()
        Log.i(TAG, "$stage after ${elapsedMs}ms")
    }

    fun markCatalogVisibleOnce() {
        if (catalogLogged.compareAndSet(false, true)) {
            mark("catalog_visible")
        }
    }
}
