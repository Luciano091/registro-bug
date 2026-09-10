package br.com.ritmesa.entregador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DeliveryLocationService extends Service {
    public static final String ACTION_START = "br.com.ritmesa.entregador.START_TRACKING";
    public static final String ACTION_STOP = "br.com.ritmesa.entregador.STOP_TRACKING";
    public static final String EXTRA_ORDER_ID = "orderId";
    public static final String EXTRA_ENDPOINT = "endpoint";
    public static final String EXTRA_TOKEN = "token";
    private static final String CHANNEL_ID = "ritmesa_delivery_tracking";
    private static final String PREFS = "delivery_tracking";
    private static final String PREF_ACTIVE = "active";
    private static final String PREF_ORDER_ID = "order_id";
    private static final int NOTIFICATION_ID = 2401;
    private static volatile boolean running = false;

    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private FusedLocationProviderClient locationClient;
    private LocationCallback locationCallback;
    private String endpoint;
    private String token;

    @Override
    public void onCreate() {
        super.onCreate();
        locationClient = LocationServices.getFusedLocationProviderClient(this);
        locationCallback = new LocationCallback() {
            @Override public void onLocationResult(LocationResult result) {
                Location location = result.getLastLocation();
                if (location != null && location.getAccuracy() <= 100f) sendLocation(location);
            }
        };
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopTracking();
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(intent.getAction())) return START_NOT_STICKY;

        endpoint = intent.getStringExtra(EXTRA_ENDPOINT);
        token = intent.getStringExtra(EXTRA_TOKEN);
        int orderId = intent.getIntExtra(EXTRA_ORDER_ID, -1);
        if (endpoint == null || token == null || orderId < 1) {
            stopTracking();
            return START_NOT_STICKY;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        prefs.edit().putBoolean(PREF_ACTIVE, true).putInt(PREF_ORDER_ID, orderId).apply();
        running = true;
        Notification notification = buildNotification(orderId);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        requestUpdates();
        return START_NOT_STICKY;
    }

    @SuppressWarnings("MissingPermission")
    private void requestUpdates() {
        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10_000L)
            .setMinUpdateIntervalMillis(5_000L)
            .setMaxUpdateDelayMillis(15_000L)
            .setMinUpdateDistanceMeters(10f)
            .build();
        locationClient.removeLocationUpdates(locationCallback);
        locationClient.requestLocationUpdates(request, locationCallback, getMainLooper());
    }

    private void sendLocation(Location location) {
        final String requestEndpoint = endpoint;
        final String requestToken = token;
        if (requestEndpoint == null || requestToken == null) return;
        networkExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(requestEndpoint).openConnection();
                connection.setRequestMethod("PUT");
                connection.setConnectTimeout(10_000);
                connection.setReadTimeout(10_000);
                connection.setRequestProperty("Authorization", "Bearer " + requestToken);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setDoOutput(true);
                String payload = "{\"latitude\":" + location.getLatitude() + ",\"longitude\":" + location.getLongitude() + "}";
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload.getBytes(StandardCharsets.UTF_8));
                }
                int responseCode = connection.getResponseCode();
                if (responseCode == 401 || responseCode == 403 || responseCode == 404 || responseCode == 409) stopTracking();
            } catch (Exception ignored) {
                // A próxima posição substitui a pendente quando a conexão retornar.
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private Notification buildNotification(int orderId) {
        Intent openIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent openPendingIntent = PendingIntent.getActivity(this, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent stopIntent = new Intent(this, DeliveryLocationService.class).setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 1, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(getString(R.string.tracking_notification_title))
            .setContentText(getString(R.string.tracking_notification_text) + " #" + orderId)
            .setContentIntent(openPendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(0, getString(R.string.tracking_notification_stop), stopPendingIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, getString(R.string.tracking_channel_name), NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Mantém o GPS ativo somente durante uma entrega.");
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    private void stopTracking() {
        if (locationClient != null && locationCallback != null) locationClient.removeLocationUpdates(locationCallback);
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().clear().apply();
        running = false;
        endpoint = null;
        token = null;
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override public void onDestroy() {
        if (locationClient != null && locationCallback != null) locationClient.removeLocationUpdates(locationCallback);
        running = false;
        networkExecutor.shutdownNow();
        super.onDestroy();
    }

    @Nullable @Override public IBinder onBind(Intent intent) { return null; }

    public static boolean isActive(Context context) {
        return running && context.getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(PREF_ACTIVE, false);
    }

    public static Integer activeOrderId(Context context) {
        int value = context.getSharedPreferences(PREFS, MODE_PRIVATE).getInt(PREF_ORDER_ID, -1);
        return value > 0 ? value : null;
    }
}
