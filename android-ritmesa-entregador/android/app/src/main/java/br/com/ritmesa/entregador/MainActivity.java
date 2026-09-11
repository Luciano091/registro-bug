package br.com.ritmesa.entregador;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static final String EXTRA_PUSH_ORDER_ID = "pedido_id";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocationTrackingPlugin.class);
        registerPlugin(PushNotificationPlugin.class);
        super.onCreate(savedInstanceState);
        RitmesaFirebaseMessagingService.createChannel(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String orderId = intent.getStringExtra(EXTRA_PUSH_ORDER_ID);
        if (orderId != null && bridge != null) {
            bridge.triggerWindowJSEvent("ritmesaPushOpen", "{\"orderId\":" + orderId + "}");
        }
    }
}
