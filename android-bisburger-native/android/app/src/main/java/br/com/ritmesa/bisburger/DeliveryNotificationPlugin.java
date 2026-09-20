package br.com.ritmesa.bisburger;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeliveryNotification")
public class DeliveryNotificationPlugin extends Plugin {

    private static final String CHANNEL_ID = "delivery_channel";
    private static final int NOTIFICATION_ID = 999;

    @PluginMethod
    public void showProgress(PluginCall call) {
        Context context = getContext();
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Entregas",
                    NotificationManager.IMPORTANCE_HIGH
            );
            notificationManager.createNotificationChannel(channel);
        }

        String title = call.getString("title", "Estamos chegando...");
        int progress = call.getInt("progress", 80);

        RemoteViews customView = new RemoteViews(context.getPackageName(), R.layout.notification_delivery);
        customView.setTextViewText(R.id.notif_title, title);
        customView.setProgressBar(R.id.notif_progress, 100, progress, false);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                .setCustomContentView(customView)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);

        notificationManager.notify(NOTIFICATION_ID, builder.build());

        call.resolve();
    }
}
