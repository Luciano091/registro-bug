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

@CapacitorPlugin(
    name = "RitmesaLocation",
    permissions = {
        @Permission(alias = "location", strings = {
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_FINE_LOCATION
        }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class LocationTrackingPlugin extends Plugin {
    @PluginMethod
    public void startTracking(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionResult");
            return;
        }
        beginTracking(call);
    }

    @PermissionCallback
    private void locationPermissionResult(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Autorize a localização precisa para acompanhar a entrega.");
            return;
        }
        beginTracking(call);
    }

    private void beginTracking(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionResult");
            return;
        }
        launchService(call);
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Autorize as notificações para manter o rastreamento visível durante a entrega.");
            return;
        }
        launchService(call);
    }

    private void launchService(PluginCall call) {
        Integer orderId = call.getInt("orderId");
        String endpoint = call.getString("endpoint");
        String token = call.getString("token");
        if (orderId == null || endpoint == null || token == null || endpoint.isBlank() || token.isBlank()) {
            call.reject("Dados da entrega ou da sessão estão incompletos.");
            return;
        }

        Intent intent = new Intent(getContext(), DeliveryLocationService.class);
        intent.setAction(DeliveryLocationService.ACTION_START);
        intent.putExtra(DeliveryLocationService.EXTRA_ORDER_ID, orderId);
        intent.putExtra(DeliveryLocationService.EXTRA_ENDPOINT, endpoint);
        intent.putExtra(DeliveryLocationService.EXTRA_TOKEN, token);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) getContext().startForegroundService(intent);
        else getContext().startService(intent);
        call.resolve(status(true, orderId));
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        Intent intent = new Intent(getContext(), DeliveryLocationService.class);
        intent.setAction(DeliveryLocationService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve(status(false, null));
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        boolean active = DeliveryLocationService.isActive(getContext());
        Integer orderId = active ? DeliveryLocationService.activeOrderId(getContext()) : null;
        call.resolve(status(active, orderId));
    }

    private JSObject status(boolean active, Integer orderId) {
        JSObject result = new JSObject();
        result.put("active", active);
        if (orderId != null) result.put("orderId", orderId);
        return result;
    }
}
