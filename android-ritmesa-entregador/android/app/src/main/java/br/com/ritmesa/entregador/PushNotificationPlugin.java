package br.com.ritmesa.entregador;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(
    name = "RitmesaPush",
    permissions = @Permission(alias = "notifications", strings = Manifest.permission.POST_NOTIFICATIONS)
)
public class PushNotificationPlugin extends Plugin {
    @PluginMethod
    public void register(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionResult");
            return;
        }
        resolveToken(call);
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Autorize as notificações para receber novas entregas.");
            return;
        }
        resolveToken(call);
    }

    private void resolveToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null) {
                call.reject("Não foi possível registrar este aparelho no Firebase.", task.getException());
                return;
            }
            JSObject result = new JSObject();
            result.put("token", task.getResult());
            result.put("platform", "android");
            String version = "1.1.0";
            try {
                version = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName;
            } catch (Exception ignored) {}
            result.put("appVersion", version);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getInitialNotification(PluginCall call) {
        Intent intent = getActivity().getIntent();
        String orderId = intent.getStringExtra(MainActivity.EXTRA_PUSH_ORDER_ID);
        JSObject result = new JSObject();
        if (orderId != null && !orderId.isBlank()) {
            result.put("orderId", Integer.parseInt(orderId));
            intent.removeExtra(MainActivity.EXTRA_PUSH_ORDER_ID);
        }
        call.resolve(result);
    }
}
