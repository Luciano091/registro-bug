package br.com.ritmesa.bisburger;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(DeliveryNotificationPlugin.class);
        registerPlugin(FirebaseTokenPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
