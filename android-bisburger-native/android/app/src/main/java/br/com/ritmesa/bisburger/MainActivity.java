package br.com.ritmesa.bisburger;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import android.content.pm.PackageManager;
import android.Manifest;


public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(DeliveryNotificationPlugin.class);
        registerPlugin(FirebaseTokenPlugin.class);
                super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

    }
}
