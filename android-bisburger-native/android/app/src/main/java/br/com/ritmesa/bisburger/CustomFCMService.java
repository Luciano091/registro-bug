package br.com.ritmesa.bisburger;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class CustomFCMService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "delivery_channel";
    private static final int NOTIFICATION_ID = 999;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Map<String, String> data = remoteMessage.getData();
        if (data.containsKey("type") && data.get("type").equals("delivery_progress")) {
            showCustomNotification(data);
        } else {
            // Forward to Capacitor plugin if we were using it, or handle normally
        }
    }

    private void showCustomNotification(Map<String, String> data) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Entregas",
                    NotificationManager.IMPORTANCE_HIGH
            );
            notificationManager.createNotificationChannel(channel);
        }

        String title = data.containsKey("title") ? data.get("title") : "Estamos chegando com seu BisBurger!";
        int progress = data.containsKey("progress") ? Integer.parseInt(data.get("progress")) : 80;

        RemoteViews customView = new RemoteViews(getPackageName(), R.layout.notification_delivery);
        customView.setTextViewText(R.id.notif_title, title);
        customView.setProgressBar(R.id.notif_progress, 100, progress, false);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                .setCustomContentView(customView)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);

        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }
}
