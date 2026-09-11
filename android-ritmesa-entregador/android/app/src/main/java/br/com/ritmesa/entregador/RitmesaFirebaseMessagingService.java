package br.com.ritmesa.entregador;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class RitmesaFirebaseMessagingService extends FirebaseMessagingService {
    public static final String CHANNEL_ID = "ritmesa_delivery_alerts";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        String title = getString(R.string.push_default_title);
        String body = getString(R.string.push_default_text);
        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) title = message.getNotification().getTitle();
            if (message.getNotification().getBody() != null) body = message.getNotification().getBody();
        }
        String orderId = message.getData().get("pedido_id");
        showNotification(title, body, orderId);
    }

    @Override
    public void onNewToken(String token) {
        getSharedPreferences("ritmesa_push", MODE_PRIVATE).edit().putString("pending_token", token).apply();
    }

    private void showNotification(String title, String body, String orderId) {
        createChannel(this);
        Intent intent = new Intent(this, MainActivity.class)
            .setAction("OPEN_DELIVERIES")
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (orderId != null) intent.putExtra(MainActivity.EXTRA_PUSH_ORDER_ID, orderId);
        int requestCode = orderId == null ? 0 : orderId.hashCode();
        PendingIntent pendingIntent = PendingIntent.getActivity(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE);
        getSystemService(NotificationManager.class).notify(requestCode, builder.build());
    }

    public static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.push_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(context.getString(R.string.push_channel_description));
        channel.enableVibration(true);
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
}
