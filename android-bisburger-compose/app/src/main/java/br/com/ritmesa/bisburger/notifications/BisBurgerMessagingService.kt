package br.com.ritmesa.bisburger.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import br.com.ritmesa.bisburger.BisBurgerApplication
import br.com.ritmesa.bisburger.MainActivity
import br.com.ritmesa.bisburger.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class BisBurgerMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        (application as BisBurgerApplication).registerPushToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val data = message.data
        val title = data["title"]
            ?: message.notification?.title
            ?: "BisBurger"
        val body = message.notification?.body ?: when (data["type"] ?: data["tipo"]) {
            "delivery_progress" -> "Acompanhe o andamento da sua entrega."
            "pedido_pronto" -> "Seu pedido está pronto."
            else -> "Temos uma atualização para você."
        }
        val progress = data["progress"]?.toIntOrNull()?.coerceIn(0, 100)
        showNotification(title, body, progress)
    }

    private fun showNotification(title: String, body: String, progress: Int?) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "Entregas",
                    NotificationManager.IMPORTANCE_HIGH,
                ),
            )
        }

        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(MainActivity.EXTRA_OPEN_ORDERS, true)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(getColor(R.color.notification_color))
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openApp)
            .setAutoCancel(true)
            .apply {
                if (progress != null) {
                    setProgress(100, progress, false)
                    setOngoing(progress < 100)
                }
            }
            .build()

        manager.notify(DELIVERY_NOTIFICATION_ID, notification)
    }

    companion object {
        private const val CHANNEL_ID = "delivery_channel"
        private const val DELIVERY_NOTIFICATION_ID = 999
    }
}
